// @flow
/*
    Pillar Wallet: the personal data locker
    Copyright (C) 2019 Stiftung Pillar Project

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along
    with this program; if not, write to the Free Software Foundation, Inc.,
    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
*/

import * as React from 'react';
import { useQuery } from 'react-query';
import { BigNumber } from 'bignumber.js';
import { orderBy } from 'lodash';

// Selectors
import { useRootSelector, useSupportedAssetsPerChain, useRatesPerChain, useFiatCurrency } from 'selectors';
import { useSupportedChains } from 'selectors/chains';
import { accountAssetsPerChainSelector } from 'selectors/assets';
import { accountWalletAssetsBalancesSelector } from 'selectors/balances';

// Utils
import { addressesEqual, getAssetOption, sortAssets } from 'utils/assets';
import { getWalletBalanceForAsset } from 'utils/balances';
import { nativeAssetPerChain } from 'utils/chains';
import { logBreadcrumb } from 'utils/common';

// Services
import etherspotService from 'services/etherspot';

// Constants
import { CHAIN } from 'constants/chainConstants';
import { DAI, USDT, USDC, BUSD } from 'constants/assetsConstants';

// Types
import type { QueryResult } from 'utils/types/react-query';
import type { Asset, AssetByAddress, AssetOption, AssetsPerChain } from 'models/Asset';
import type { WalletAssetsBalances } from 'models/Balances';
import type { ExchangeOffer } from 'models/Exchange';
import type { Currency, RatesPerChain } from 'models/Rates';
import type { Chain, ChainRecord } from 'models/Chain';

export function useFromAssets(): AssetOption[] {
  const supportedChains = useSupportedChains();
  const supportedAssetsPerChain = useSupportedAssetsPerChain();
  const accountAssetsPerChain = useRootSelector(accountAssetsPerChainSelector);
  const walletBalancesPerChain = useRootSelector(accountWalletAssetsBalancesSelector);
  const ratesPerChain = useRatesPerChain();
  const currency = useFiatCurrency();

  return React.useMemo(() => {
    return supportedChains.flatMap((chain) =>
      getExchangeFromAssetOptions(
        chain,
        supportedAssetsPerChain,
        accountAssetsPerChain,
        walletBalancesPerChain,
        ratesPerChain,
        currency,
      ),
    );
  }, [
    supportedChains,
    supportedAssetsPerChain,
    accountAssetsPerChain,
    walletBalancesPerChain,
    ratesPerChain,
    currency,
  ]);
}

export function useGasFeeAssets(chain: Chain) {
  const listOfBalanceAssets = useFromAssets();

  const chainAssets = React.useMemo(() => {
    if (!listOfBalanceAssets?.[0] || !chain) return null;
    const currentChainAssets = listOfBalanceAssets.filter((item) => item.chain === chain);
    return currentChainAssets;
  }, [chain, listOfBalanceAssets]);

  if (!chainAssets?.[0]) return null;

  const nativeAsset = nativeAssetPerChain[chain];

  const stableCoin = [DAI, USDC, USDT];
  const xDaiStableCoin = [USDC];
  const binanceStableCoin = [...stableCoin, BUSD];

  // eslint-disable-next-line no-nested-ternary
  const stableCoins = chain === CHAIN.BINANCE ? binanceStableCoin : chain === CHAIN.XDAI ? xDaiStableCoin : stableCoin;

  const stableAssets: any = chainAssets?.filter(
    (item) => item.symbol === nativeAsset.symbol || stableCoins.includes(item.symbol),
  );

  if (!stableAssets?.[0]) return [nativeAsset];

  stableAssets?.sort((a, b) => b?.balance?.balanceInFiat - a?.balance?.balanceInFiat);

  return stableAssets;
}

export function useToAssetsCrossChain(removeChainNm: Chain): AssetOption[] {
  const supportedChains = useSupportedChains();
  const filteredSupportedList = supportedChains.filter((chainNm: Chain) => chainNm !== removeChainNm);
  const supportedAssetsPerChain = useSupportedAssetsPerChain();
  const walletBalancesPerChain = useRootSelector(accountWalletAssetsBalancesSelector);
  const ratesPerChain = useRatesPerChain();
  const currency = useFiatCurrency();

  return React.useMemo(() => {
    return filteredSupportedList.flatMap((chain) =>
      getExchangeToAssetOptions(chain, supportedAssetsPerChain, walletBalancesPerChain, ratesPerChain, currency),
    );
  }, [filteredSupportedList, supportedAssetsPerChain, walletBalancesPerChain, ratesPerChain, currency]);
}

function getExchangeFromAssetOptions(
  chain: Chain,
  supportedAssetsPerChain: AssetsPerChain,
  accountAssetsPerChain: ChainRecord<AssetByAddress>,
  walletBalancesPerChain: ChainRecord<WalletAssetsBalances>,
  ratesPerChain: RatesPerChain,
  currency: Currency,
): AssetOption[] {
  const nativeAssetAddress = nativeAssetPerChain[chain].address;
  const supportedAssets = supportedAssetsPerChain?.[chain] ?? [];
  const accountAssets = accountAssetsPerChain?.[chain] ?? {};
  const walletBalances = walletBalancesPerChain?.[chain] ?? {};
  const rates = ratesPerChain?.[chain] ?? {};

  const isMatching = (asset: Asset) =>
    addressesEqual(asset.address, nativeAssetAddress) || getWalletBalanceForAsset(walletBalances, asset.address).gt(0);
  const isSupported = (asset: Asset) =>
    supportedAssets.some((supportedAsset) => addressesEqual(asset.address, supportedAsset.address));

  return sortAssets(accountAssets)
    .filter((asset) => {
      if (!asset) {
        // debug and safe return for Sentry issue #2605322771
        logBreadcrumb('getExchangeFromAssetOptions', 'failed: no asset', { asset, accountAssets });
        return false;
      }
      return isMatching(asset) && isSupported(asset);
    })
    .map((asset) => getAssetOption(asset, walletBalances, rates, currency, chain));
}

export function useToAssets(chain: ?Chain) {
  const supportedAssetsPerChain = useSupportedAssetsPerChain();
  const walletBalancesPerChain = useRootSelector(accountWalletAssetsBalancesSelector);
  const ratesPerChain = useRatesPerChain();
  const currency = useFiatCurrency();

  return React.useMemo(() => {
    return getExchangeToAssetOptions(chain, supportedAssetsPerChain, walletBalancesPerChain, ratesPerChain, currency);
  }, [chain, supportedAssetsPerChain, walletBalancesPerChain, ratesPerChain, currency]);
}

function getExchangeToAssetOptions(
  chain: ?Chain,
  supportedAssetsPerChain: AssetsPerChain,
  walletBalancesPerChain: ChainRecord<WalletAssetsBalances>,
  ratesPerChain: RatesPerChain,
  currency: Currency,
): AssetOption[] {
  if (!chain) return [];

  const supportedAssets = supportedAssetsPerChain?.[chain] ?? [];
  const walletBalances = walletBalancesPerChain?.[chain] ?? {};
  const rates = ratesPerChain?.[chain] ?? {};

  return supportedAssets.map((asset) => getAssetOption(asset, walletBalances, rates, currency, chain));
}

export function useOffersQuery(
  chain: Chain,
  fromAsset: ?AssetOption,
  toAsset: ?AssetOption,
  fromAmount: string,
): QueryResult<ExchangeOffer[]> {
  const enabled = shouldTriggerSearch(fromAsset, toAsset, fromAmount);

  return useQuery(
    ['ExchangeOffers', fromAsset, toAsset, fromAmount],
    () => etherspotService.getExchangeOffers(chain, fromAsset, toAsset, BigNumber(fromAmount)),
    { enabled, cacheTime: 0 },
  );
}

export function useCrossChainBuildTransactionQuery(fromAsset: AssetOption, toAsset: AssetOption, fromValue: BigNumber) {
  const enabled = !!fromAsset && !!toAsset && !!fromValue;

  return useQuery(
    ['buildCrossChainBridgeTransaction', fromAsset, toAsset, fromValue],
    () => etherspotService.buildCrossChainBridgeTransaction(fromAsset, toAsset, fromValue),
    { enabled, cacheTime: 0 },
  );
}

export function sortOffers(offers: ?(ExchangeOffer[])): ?(ExchangeOffer[]) {
  if (!offers) return null;
  return orderBy(offers, [(offer) => offer.toAmount.toNumber()], ['desc']);
}

export const shouldTriggerSearch = (
  fromAsset: ?AssetOption,
  toAsset: ?AssetOption,
  fromAmount: string,
): boolean %checks => {
  return (
    !!fromAsset &&
    !!toAsset &&
    !!+fromAmount &&
    fromAmount[fromAmount.length - 1] !== '.' &&
    !addressesEqual(fromAsset.address, toAsset.address) &&
    fromAsset.chain === toAsset.chain &&
    isEnoughAssetBalance(fromAsset.assetBalance, fromAmount)
  );
};

export const assetTitle = (item: any) => {
  if (!item?.balance) return item.symbol;

  const {
    balance: { balance: fiatBalance },
    formattedBalanceInFiat,
    symbol,
  } = item;

  // eslint-disable-next-line i18next/no-literal-string
  return `${fiatBalance?.toFixed(1)} ${symbol}  •  ${formattedBalanceInFiat}`;
};

const isEnoughAssetBalance = (assetBalance: ?string, amount: string): boolean => {
  try {
    const amountBN = new BigNumber(amount);
    const balanceBN = new BigNumber(assetBalance ?? 0);
    // assetBalance is fixed to 6 digits and amount is not, so usually amount will be technically higher
    // fix and round both down to 6 to get meaningful info
    const amountFixed = amountBN.toFixed(6, 1);
    const balanceFixed = balanceBN.toFixed(6, 1);
    return new BigNumber(balanceFixed).isGreaterThanOrEqualTo(new BigNumber(amountFixed));
  } catch {
    return false;
  }
};
