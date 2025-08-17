def build_oracle_mapping(plan, args, addresses):
    return {"eip7683": {"network_ids": [int(k) for k in addresses.keys()], "oracle_addresses": {}}}
