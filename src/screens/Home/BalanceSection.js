// @flow
/*
    Pillar Wallet: the personal data locker
    Copyright (C) 2021 Stiftung Pillar Project

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
import styled from 'styled-components/native';
import { BigNumber } from 'bignumber.js';
import { useTranslationWithPrefix } from 'translations/translate';
import { useNavigation } from 'react-navigation-hooks';
import { Platform } from 'react-native';
import { useDispatch } from 'react-redux';

// Components
import Text from 'components/core/Text';
import Tooltip from 'components/Tooltip';

// Selectors
import { useActiveAccount, useRootSelector, useFiatCurrency } from 'selectors';

// Utils
import { formatFiatValue, formatFiatChangeExtended } from 'utils/format';
import { useThemeColors } from 'utils/themes';
import { spacing } from 'utils/variables';
import { isKeyBasedAccount } from 'utils/accounts';

// Constants
import { ADD_CASH } from 'constants/navigationConstants';

// Actions
import { dismissAddCashTooltipAction } from 'actions/appSettingsActions';

// Local
import SpecialButton from './components/SpecialButton';

type Props = {|
  balanceInFiat: BigNumber,
  changeInFiat?: ?BigNumber,
  showBalance?: boolean,
  onBalanceClick?: () => mixed,
|};

function BalanceSection({ balanceInFiat, changeInFiat, showBalance, onBalanceClick }: Props) {
  const { t, tRoot } = useTranslationWithPrefix('home.balance');
  const colors = useThemeColors();
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const fiatCurrency = useFiatCurrency();
  const activeAccount = useActiveAccount();

  const initialBalance = changeInFiat ? balanceInFiat.minus(changeInFiat) : null;
  const formattedChange = formatFiatChangeExtended(changeInFiat, initialBalance, fiatCurrency);

  const { addCashTooltipDismissed } = useRootSelector(({ appSettings }) => appSettings.data);

  const visibleAddCashTooltip = !addCashTooltipDismissed && parseFloat(balanceInFiat) === 0.0;

  const [visibleTooltip, setVisibleTooltip] = React.useState(false);

  React.useEffect(() => {
    if (visibleAddCashTooltip) {
      setTimeout(() => {
        setVisibleTooltip(true);
      }, 3000);
    } else {
      setVisibleTooltip(false);
    }
  }, [addCashTooltipDismissed, balanceInFiat, visibleAddCashTooltip]);

  const onAddCashPress = () => {
    navigation.navigate(ADD_CASH);
    dispatch(dismissAddCashTooltipAction());
  };

  return (
    <>
      <Container>
        <FirstColumn>
          <TouchableContainer onPress={onBalanceClick}>
            <BalanceText numberOfLines={1} adjustsFontSizeToFit>
              {showBalance ? formatFiatValue(balanceInFiat, fiatCurrency) : '***'}
            </BalanceText>
          </TouchableContainer>
          {!!formattedChange && (
            <ProfitContainer>
              <ProfitLabel color={colors.secondaryText}>{t('lastWeek')}</ProfitLabel>
              <ProfitValue color={colors.positive}>{formattedChange}</ProfitValue>
            </ProfitContainer>
          )}
        </FirstColumn>

        {!isKeyBasedAccount(activeAccount) && (
          <SecondColumn>
            <SpecialButton title={tRoot('button.addCash')} iconName="add-cash" onPress={onAddCashPress} />
          </SecondColumn>
        )}
      </Container>
      {!isKeyBasedAccount(activeAccount) && (
        <Tooltip
          isVisible={visibleTooltip}
          body={tRoot('tooltip.start_by_cash')}
          wrapperStyle={wrapperStyle}
          onPress={onAddCashPress}
        />
      )}
    </>
  );
}

export default BalanceSection;

const wrapperStyle = {
  zIndex: 1999,
  position: 'relative',
  alignSelf: 'flex-end',
  width: 150,
  height: 10,
  top: Platform.OS === 'ios' ? -20 : -10,
};

const Container = styled.View`
  flex-direction: row;
  justify-content: center;
  padding: 0 ${spacing.layoutSides}px;
`;

const FirstColumn = styled.View`
  flex: 1;
  justify-content: center;
  margin-right: ${spacing.large}px;
`;

const SecondColumn = styled.View`
  justify-content: center;
`;

const BalanceText = styled(Text)`
  font-size: 36px;
  font-variant: tabular-nums;
`;

const ProfitContainer = styled.View`
  flex-direction: row;
  margin-top: ${spacing.extraSmall}px;
`;
const ProfitLabel = styled(Text)`
  margin-right: 6px;
`;

const ProfitValue = styled(Text)`
  font-variant: tabular-nums;
`;

const TouchableContainer = styled.TouchableOpacity``;
