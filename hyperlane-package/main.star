def _get(arg_map, key, default=""):
    return arg_map[key] if key in arg_map else default

def _as_bool(v, default=False):
    if type(v) == "bool":
        return v
    if type(v) == "string":
        lv = v.lower()
        if lv in ["true", "1", "yes"]:
            return True
        if lv in ["false", "0", "no"]:
            return False
    return default

def _join(arr, sep):
    out = ""
    for i, x in enumerate(arr):
        if i > 0:
            out += sep
        out += x
    return out

def run(plan, args):
    chains = _get(args, "chains", [])
    agents = _get(args, "agents", {})
    warp_routes = _get(args, "warp_routes", [])
    send_test = _get(args, "send_test", {})
    glob = _get(args, "global", {})
    if len(chains) < 2:
        fail("at least 2 chains are required")
    agent_tag = _get(glob, "agent_image_tag", "agents-v1.4.0")
    cli_version = _get(glob, "cli_version", "latest")
    registry_mode = _get(glob, "registry_mode", "public")
    relayer_cfg = _get(agents, "relayer", {})
    relayer_key = _get(relayer_cfg, "key", "")
    allow_local_sync = _as_bool(_get(relayer_cfg, "allow_local_checkpoint_syncers", True), True)
    deployer_cfg = _get(agents, "deployer", {})
    deployer_key = _get(deployer_cfg, "key", "")

    configs_dir = Directory(persistent_key="configs")
    val_ckpts_dir = Directory(persistent_key="validator-checkpoints")
    relayer_db_dir = Directory(persistent_key="relayer-db")

    cli_img = ImageBuildSpec(
        image_name = "hyperlane-cli-img",
        build_context_dir = "./src/cli",
    )

    agent_cfg_img = ImageBuildSpec(
        image_name = "agent-config-gen-img",
        build_context_dir = "./src/tools/agent-config-gen",
    )

    chain_names = []
    for ch in chains:
        chain_names.append(ch["name"])
    relay_chains = _join(chain_names, ",")

    rpc_pairs = []
    id_pairs = []
    for ch in chains:
        rpc_pairs.append(ch["name"] + "=" + ch["rpc_url"])
        if "chain_id" in ch:
            id_pairs.append(ch["name"] + "=" + str(ch["chain_id"]))
    chain_rpcs = _join(rpc_pairs, ",")
    chain_ids = _join(id_pairs, ",")
    cli_env = {
        "CLI_VERSION": str(cli_version),
        "REGISTRY_MODE": str(registry_mode),
        "CHAIN_NAMES": relay_chains,
        "CHAIN_RPCS": chain_rpcs,
        "CHAIN_IDS": chain_ids,
        "HYP_KEY": str(deployer_key),
    }

    plan.add_service(
        name = "hyperlane-cli",
        config = ServiceConfig(
            image = cli_img,
            env_vars = cli_env,
            files = {
                "/configs": configs_dir,
            },
        ),
    )
    need_core = False
    for ch in chains:
        if _as_bool(_get(ch, "deploy_core", False), False):
            need_core = True

    if need_core:
        plan.exec(
            service_name = "hyperlane-cli",
            recipe = ExecRecipe(
                command = ["sh", "-lc", "/usr/local/bin/deploy_core.sh"],
            ),
        )

    for wr in warp_routes:
        sym = _get(wr, "symbol", "route")
        mode = _get(wr, "mode", "lock_release")
        plan.exec(
            service_name = "hyperlane-cli",
            recipe = ExecRecipe(
                command = ["sh", "-lc", "ROUTE_SYMBOL=" + sym + " MODE=" + mode + " /usr/local/bin/warp_routes.sh"],
            ),
        )
        init_liq = _get(wr, "initialLiquidity", [])
        if len(init_liq) > 0:
            pairs = []
            for il in init_liq:
                c = _get(il, "chain", "")
                a = _get(il, "amount", "")
                if c != "" and a != "":
                    pairs.append(c + "=" + str(a))
            liq_str = _join(pairs, ",")
            if liq_str != "":
                plan.exec(
                    service_name = "hyperlane-cli",
                    recipe = ExecRecipe(
                        command = ["sh", "-lc", "SYMBOL=" + sym + " REGISTRY_DIR=/configs/registry INITIAL_LIQUIDITY=\"" + liq_str + "\" /usr/local/bin/seed_liquidity.sh"],
                    ),
                )

    yaml_content = "chains:\n"
    for ch in chains:
        name = ch["name"]
        rpc = ch["rpc_url"]
        yaml_content += "  - name: " + name + "\n"
        yaml_content += "    rpc_url: " + rpc + "\n"
        yaml_content += "    existing_addresses: {}\n"

    files_art = plan.render_templates(
        config = {
            "args.yaml": struct(template=yaml_content, data=struct()),
            "agent-config.json": struct(template="{}", data=struct()),
        },
        name = "agent-config-seed",
        description = "seed args.yaml and agent-config.json",
    )

    plan.add_service(
        name = "agent-config-gen",
        config = ServiceConfig(
            image = agent_cfg_img,
            env_vars = {"ENABLE_PUBLIC_FALLBACK": "false"},
            files = {
                "/seed": files_art,
                "/configs": configs_dir,
            },
            cmd = ["/seed/args.yaml", "/configs/agent-config.json"],
        ),
    )

    agent_image = "gcr.io/abacus-labs-dev/hyperlane-agent:" + str(agent_tag)

    for vdesc in _get(agents, "validators", []):
        vchain = vdesc["chain"]
        vkey = vdesc["signing_key"]
        cs = vdesc["checkpoint_syncer"]
        cstype = cs["type"]
        csp = _get(cs, "params", {})
        svc_name = "validator-" + vchain
        rpc_url = ""
        for ch2 in chains:
            if ch2["name"] == vchain:
                rpc_url = ch2["rpc_url"]
        env = {
            "VALIDATOR_KEY": vkey,
            "ORIGIN_CHAIN": vchain,
            "RPC_URL": rpc_url,
        }
        if cstype == "local":
            env["CHECKPOINT_SYNCER_TYPE"] = "local"
            env["CHECKPOINT_SYNCER_PATH"] = "/data/validator-checkpoints"
        elif cstype == "s3":
            env["CHECKPOINT_SYNCER_TYPE"] = "s3"
            if "bucket" in csp:
                env["S3_BUCKET"] = str(csp["bucket"])
            if "region" in csp:
                env["S3_REGION"] = str(csp["region"])
            if "prefix" in csp:
                env["S3_PREFIX"] = str(csp["prefix"])
            if "basePath" in csp:
                env["CHECKPOINT_BASE_PATH"] = str(csp["basePath"])
        elif cstype == "gcs":
            env["CHECKPOINT_SYNCER_TYPE"] = "gcs"
            if "bucket" in csp:
                env["S3_BUCKET"] = str(csp["bucket"])
            if "prefix" in csp:
                env["S3_PREFIX"] = str(csp["prefix"])
            if "basePath" in csp:
                env["CHECKPOINT_BASE_PATH"] = str(csp["basePath"])
        else:
            env["CHECKPOINT_SYNCER_TYPE"] = "local"
            env["CHECKPOINT_SYNCER_PATH"] = "/validator-checkpoints"

        plan.add_service(
            name = svc_name,
            config = ServiceConfig(
                image = agent_image,
                env_vars = dict(env, CONFIG_FILES="/configs/agent-config.json", RUST_LOG="debug"),
                files = {
                    "/configs": configs_dir,
                },
                cmd = [
                    "sh",
                    "-lc",
                    "mkdir -p /data/validator-checkpoints && " +
                    "/app/validator --originChainName $ORIGIN_CHAIN --validator.key $VALIDATOR_KEY" +
                    " --chains.$ORIGIN_CHAIN.connection.url $RPC_URL" +
                    " --checkpointSyncer.type $CHECKPOINT_SYNCER_TYPE" +
                    " --checkpointSyncer.path ${CHECKPOINT_SYNCER_PATH:-/data/validator-checkpoints}" +
                    " --checkpointSyncer.bucket ${S3_BUCKET:-}" +
                    " --checkpointSyncer.region ${S3_REGION:-}" +
                    " --checkpointSyncer.prefix ${S3_PREFIX:-}" +
                    " --checkpointSyncer.basePath ${CHECKPOINT_BASE_PATH:-}"
                ],
            ),
        )

    relayer_env = {
        "RELAYER_KEY": relayer_key,
        "ALLOW_LOCAL": "true" if allow_local_sync else "false",
        "RELAY_CHAINS": relay_chains,
        "CONFIG_FILES": "/configs/agent-config.json",
    }
    relayer_cmd = "/app/relayer --relayChains $RELAY_CHAINS --defaultSigner.key $RELAYER_KEY --db /data/relayer-db"
    for ch in chains:
        relayer_cmd += " --chains." + ch["name"] + ".connection.url " + ch["rpc_url"]
    if allow_local_sync:
        relayer_cmd += " --allowLocalCheckpointSyncers true"
    plan.add_service(
        name = "relayer",
        config = ServiceConfig(
            image = agent_image,
            env_vars = dict(relayer_env, RUST_LOG="debug"),
            files = {
                "/configs": configs_dir,
            },
            cmd = ["sh", "-lc", "mkdir -p /data/relayer-db /data/validator-checkpoints && " + relayer_cmd],
        ),
    )

    if _as_bool(_get(send_test, "enabled", False), False):
        origin = _get(send_test, "origin", "ethereum")
        dest = _get(send_test, "destination", "arbitrum")
        amt = _get(send_test, "amount", "1")
        test_symbol = "TEST"
        if len(warp_routes) > 0:
            test_symbol = _get(warp_routes[0], "symbol", test_symbol)
        plan.exec(
            service_name = "hyperlane-cli",
            recipe = ExecRecipe(
                command = ["sh", "-lc", "REGISTRY_DIR=/configs/registry SYMBOL=" + test_symbol + " ORIGIN=" + origin + " DESTINATION=" + dest + " AMOUNT=" + str(amt) + " /usr/local/bin/send_warp.sh"],
            ),
        )

    return None
