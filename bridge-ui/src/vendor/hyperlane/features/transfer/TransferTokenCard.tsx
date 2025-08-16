import React from "react";
import { Card } from "../../components/layout/Card";
import TransferTokenForm from "./TransferTokenForm";
import type { ChainKey, UnifiedRegistry } from "@config/types";

type Props = {
  registry: UnifiedRegistry;
  token: string;
  origin: ChainKey;
  destination: ChainKey;
  amount: string;
  extraSources?: { chain: ChainKey; amount: string }[];
};

export function TransferTokenCard(props: Props) {
  return (
    <Card className="w-full sm:w-[31rem]">
      <TransferTokenForm
        registry={props.registry}
        token={props.token}
        origin={props.origin}
        destination={props.destination}
        amount={props.amount}
        extraSources={props.extraSources}
      />
    </Card>
  );
}
