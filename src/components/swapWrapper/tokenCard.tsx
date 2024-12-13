"use client";
import TokenImg from "@/assets/images/token.jpg";

import fetchAsset from "@/lib/das/fetchAsset";
import useEscrowStore from "@/store/useEscrowStore";
import useTokenStore from "@/store/useTokenStore";
import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { TradeState } from "./swapWrapper";
import { set } from "@metaplex-foundation/umi/serializers";

interface TokenCardProps {
  tradeState: TradeState;
}

const TokenCard = (props: TokenCardProps) => {
  const { escrow } = useEscrowStore();
  const { tokenAsset, updateTokenAsset } = useTokenStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenAsset && escrow?.token) {
      setLoading(true);
      fetchAsset(escrow.token).then((asset) => {
        updateTokenAsset(asset);
      });
    } else {
      setLoading(false);
    }
  }, [escrow, tokenAsset, updateTokenAsset]);

  return (
    <Card className="flex items-center w-full border border-foreground-muted rounded-xl shadow-lg p-4 gap-4">
      {tokenAsset ? (
        <img
          src={TokenImg.src}
          className="rounded-xl w-24 aspect-square"
          alt="nft collection image"
        />
      ) : (
        <Skeleton className="w-24 h-24 rounded-xl" />
      )}

      {escrow && !loading ? (
        <div className="flex flex-col">
          {Number(escrow.amount).toLocaleString()}{" "}
          {tokenAsset?.content.metadata.name}
        </div>
      ) : (
        <Skeleton className=" w-[250px] h-8" />
      )}
    </Card>
  );
};

export default TokenCard;