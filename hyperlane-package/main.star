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
    rebal_cfg = _get(agents, "rebalancer", {})
    rebalancer_key = _get(rebal_cfg, "key", "")

    vol_configs = plan.create_volume("configs")
    vol_val_ckpts = plan.create_volume("validator-checkpoints")
    vol_relayer_db = plan.create_volume("relayer-db")
    vol_rebal_db = plan.create_volume("rebalancer-db")

    cli_img = plan.build_image(
        "hyperlane-cli-img",
        "./src/cli",
        {}
    )

    rebal_img = plan.build_image(
        "rebalancer-img",
        "./src/rebalancer",
        {}
    )

    agent_cfg_img = plan.build_image(
        "agent-config-gen-img",
        "./src/tools/agent-config-gen",
        {}
    )

    chain_names = []
    for ch in chains:
        chain_names.append(ch["name"])
    relay_chains = _join(chain_names, ",")

    rpc_pairs = []
    for ch in chains:
        rpc_pairs.append(ch["name"] + "=" + ch["rpc_url"])
    chain_rpcs = _join(rpc_pairs, ",")
    cli_env = {
        "CLI_VERSION": str(cli_version),
        "REGISTRY_MODE": str(registry_mode),
        "CHAIN_NAMES": relay_chains,
        "CHAIN_RPCS": chain_rpcs,
        "HYP_KEY": str(deployer_key),
    }

    plan.add_service(
        "hyperlane-cli",
        {
            "image": cli_img,
            "env_vars": cli_env,
            "vol_mounts": {
                vol_configs: "/configs",
            },
            "files": {
                "/configs/agent-config.json": "{}"
            },
            "ports": {},
            "cmd": [],
            "entrypoint": [],
        },
    )
    need_core = False
    for ch in chains:
        if _as_bool(_get(ch, "deploy_core", False), False):
            need_core = True

    if need_core:
        plan.exec(
            "hyperlane-cli",
            ["sh", "-lc", "/usr/local/bin/deploy_core.sh"]
        )

    for wr in warp_routes:
        sym = _get(wr, "symbol", "route")
        plan.exec(
            "hyperlane-cli",
            ["sh", "-lc", "ROUTE_SYMBOL=" + sym + " /usr/local/bin/warp_routes.sh"]
        )

    chain_obj_strs = []
    for ch in chains:
        name = ch["name"]
        rpc = ch["rpc_url"]
        existing = _get(ch, "existing_addresses", {})
        mailbox = _get(existing, "mailbox", "")
        igp = _get(existing, "igp", "")
        va = _get(existing, "validatorAnnounce", "")
        ism = _get(existing, "ism", "")
        chain_json = "{\\"name\\": \\"" + name + "\\", \\"rpc_url\\": \\"" + rpc + "\\", \\"existing_addresses\\": {\\"mailbox\\": \\"" + mailbox + "\\", \\"igp\\": \\"" + igp + "\\", \\"validatorAnnounce\\": \\"" + va + "\\", \\"ism\\": \\"" + ism + "\\"}}"
        chain_obj_strs.append(chain_json)
    args_json = "{\\n  \\"chains\\": [" + _join(chain_obj_strs, ",") + "]\\n}"
    plan.add_service(
        "agent-config-gen",
        {
            "image": agent_cfg_img,
            "vol_mounts": {
                vol_configs: "/configs",
            },
            "files": {
                "/configs/args.json": args_json,
            },
            "cmd": ["/configs/args.json", "/configs/agent-config.json"],
        },
    )


    agent_image = "gcr.io/abacus-labs-dev/hyperlane-agent:" + str(agent_tag)

    for vdesc in _get(agents, "validators", []):
        vchain = vdesc["chain"]
        vkey = vdesc["signing_key"]
        cs = vdesc["checkpoint_syncer"]
        cstype = cs["type"]
        csp = _get(cs, "params", {})
        svc_name = "validator-" + vchain
        env = {
            "VALIDATOR_KEY": vkey,
            "ORIGIN_CHAIN": vchain,
            "CONFIG_FILES": "/configs/agent-config.json",
        }
        if cstype == "local":
            env["CHECKPOINT_SYNCER_TYPE"] = "local"
            env["CHECKPOINT_SYNCER_PATH"] = "/validator-checkpoints"
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
            svc_name,
            {
                "image": agent_image,
                "env_vars": env,
                "vol_mounts": {
                    vol_val_ckpts: "/validator-checkpoints",
                    vol_configs: "/configs",
                },
                "cmd": [
                    "sh",
                    "-lc",
                    "hyperlane-validator --originChainName $ORIGIN_CHAIN --validator.key $VALIDATOR_KEY" +
                    " --checkpointSyncer.type $CHECKPOINT_SYNCER_TYPE" +
                    " --checkpointSyncer.path ${CHECKPOINT_SYNCER_PATH:-/validator-checkpoints}" +
                    " --checkpointSyncer.bucket ${S3_BUCKET:-}" +
                    " --checkpointSyncer.region ${S3_REGION:-}" +
                    " --checkpointSyncer.prefix ${S3_PREFIX:-}" +
                    " --checkpointSyncer.basePath ${CHECKPOINT_BASE_PATH:-}"
                ],
            },
        )

    relayer_env = {
        "RELAYER_KEY": relayer_key,
        "ALLOW_LOCAL": "true" if allow_local_sync else "false",
        "RELAY_CHAINS": relay_chains,
        "CONFIG_FILES": "/configs/agent-config.json",
    }
    relayer_cmd = "hyperlane-relayer --relayChains $RELAY_CHAINS --defaultSigner.key $RELAYER_KEY --db /relayer-db"
    if allow_local_sync:
        relayer_cmd += " --allowLocalCheckpointSyncers true"
    plan.add_service(
        "relayer",
        {
            "image": agent_image,
            "env_vars": relayer_env,
            "vol_mounts": {
                vol_configs: "/configs",
                vol_relayer_db: "/relayer-db",
                vol_val_ckpts: "/validator-checkpoints",
            },
            "cmd": ["sh", "-lc", relayer_cmd],
        },
    )

    if len(warp_routes) > 0:
        plan.add_service(
            "rebalancer",
            {
                "image": rebal_img,
                "env_vars": {
                    "PORT": "8080",
                    "REBALANCER_KEY": str(rebalancer_key),
                },
                "vol_mounts": {
                    vol_rebal_db: "/rebalancer-db",
                    vol_configs: "/configs",
                },
                "ports": {
                    "http": {"number": 8080, "protocol": "TCP"},
                },
            },
        )

    return None
