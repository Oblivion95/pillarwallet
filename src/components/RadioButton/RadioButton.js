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
import styled, { withTheme } from 'styled-components/native';

// Components
import Icon from 'components/core/Icon';

// Utils
import { spacing, borderRadiusSizes } from 'utils/variables';
import { isLightTheme } from 'utils/themes';

const RadioButton = ({ visible }) => {
  return (
    <>
      {visible && <RadioIcon name={isLightTheme() ? 'selected-radio-button' : 'checked-radio'} />}
      {!visible && <RadioIcon name={isLightTheme() ? 'radio-button' : 'unchecked-radio'} />}
    </>
  );
};

export default withTheme(RadioButton);

const RadioIcon = styled(Icon)`
  height: 24px;
  width: 24px;
  background-color: ${({ theme }) => theme.colors.basic050};
  border-radius: ${borderRadiusSizes.medium}px;
  padding-right: ${spacing.medium}px;
  margin-right: ${spacing.medium}px;
`;
