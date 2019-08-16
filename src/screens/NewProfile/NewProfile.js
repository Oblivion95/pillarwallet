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
import styled from 'styled-components/native';
import { Keyboard, Platform } from 'react-native';
import t from 'tcomb-form-native';
import { connect } from 'react-redux';
import type { NavigationScreenProp } from 'react-navigation';
import debounce from 'lodash.debounce';

import { Wrapper } from 'components/Layout';
import ContainerWithHeader from 'components/Layout/ContainerWithHeader';
import { BaseText, BoldText, Paragraph, TextLink } from 'components/Typography';
import { PERMISSIONS, SET_WALLET_PIN_CODE } from 'constants/navigationConstants';
import Button from 'components/Button';
import ProfileImage from 'components/ProfileImage';
import { InputTemplate, Form } from 'components/ProfileForm';
import { Username, MAX_USERNAME_LENGTH, MIN_USERNAME_LENGTH } from 'components/ProfileForm/profileFormDefs';
import Checkbox from 'components/Checkbox';
import { NextFooter } from 'components/Layout/NextFooter';
import HTMLContentModal from 'components/Modals/HTMLContentModal';

import { baseColors, fontSizes, fontWeights, spacing } from 'utils/variables';

import { validateUserDetailsAction, registerOnBackendAction } from 'actions/onboardingActions';
import { USERNAME_EXISTS, USERNAME_OK, CHECKING_USERNAME, INVALID_USERNAME } from 'constants/walletConstants';

const LoginForm = styled(Form)`
  margin-top: 20px;
  width: 100%;
`;

const UsernameWrapper = styled(Wrapper)`
  margin: 36px 0 20px;
  align-self: center;
  justify-content: flex-end;
  align-items: center;
  position: relative;
  top: 2px;
`;

const Text = styled(BoldText)`
  line-height: ${fontSizes.large};
  font-size: ${fontSizes.large};
  font-weight: ${fontWeights.bold};
  width: 100%;
  text-align: center;
  max-width: 230px;
`;

const ContentWrapper = styled.View`
  flex: 1;
`;

const StyledWrapper = styled.View`
  flex-grow: 1;
  padding: ${spacing.large}px;
  padding-top: 15%;
`;

const CheckboxText = styled(BaseText)`
  font-size: ${fontSizes.extraSmall}px;
  line-height: 20px;
  color: ${baseColors.coolGrey};
`;

const StyledTextLink = styled(TextLink)`
  font-size: ${fontSizes.extraSmall}px;
  line-height: 20px;
  color: ${baseColors.rockBlue};
`;

const formStructure = t.struct({
  username: Username,
});

const PROFILE_IMAGE_WIDTH = 144;

const getDefaultFormOptions = (inputDisabled: boolean, isLoading?: boolean) => ({
  fields: {
    username: {
      auto: 'placeholders',
      placeholder: 'Username',
      template: InputTemplate,
      maxLength: MAX_USERNAME_LENGTH,
      config: {
        isLoading,
        inputProps: {
          autoCapitalize: 'none',
          disabled: inputDisabled,
          autoFocus: true,
        },
        statusIcon: null,
        statusIconColor: null,
        inputType: 'bigText',
      },
    },
  },
});

type Props = {
  navigation: NavigationScreenProp<*>,
  validateUserDetails: Function,
  resetWalletState: Function,
  walletState: ?string,
  session: Object,
  apiUser: Object,
  retry?: boolean,
  registerOnBackend: Function,
};

type State = {
  value: ?{
    username: ?string,
  },
  formOptions: Object,
  hasAgreedToTerms: boolean,
  hasAgreedToPolicy: boolean,
  isPendingCheck: boolean,
  visibleModal: string,
};

const TERMS_OF_USE_MODAL = 'TERMS_OF_USE_MODAL';
const PRIVACY_POLICY_MODAL = 'PRIVACY_POLICY_MODAL';

class NewProfile extends React.Component<Props, State> {
  _form: t.form;

  constructor(props: Props) {
    super(props);
    const { apiUser } = props;
    const value = apiUser && apiUser.username ? { username: apiUser.username } : null;
    const inputDisabled = !!(apiUser && apiUser.id);
    this.state = {
      value,
      formOptions: getDefaultFormOptions(inputDisabled),
      hasAgreedToTerms: false,
      hasAgreedToPolicy: false,
      isPendingCheck: false,
      visibleModal: '',
    };
    this.validateUsername = debounce(this.validateUsername, 800);
  }

  validateUsername = (username, hasError) => {
    const { validateUserDetails } = this.props;

    if (!hasError && username.length >= MIN_USERNAME_LENGTH) {
      validateUserDetails({ username });
    }
    this.setState({ isPendingCheck: false });
  };

  handleChange = (value: Object) => {
    // Because the idea is to display the inputError label on proper circumstances
    // here we don't validate minimum length, that's done on
    // this.renderChooseUsernameScreen() const shouldNextButtonBeDisabled
    const validateUsername = t.validate(value, formStructure);
    const isValidUsername = validateUsername.isValid();
    const { message: errorMessage = '' } = validateUsername.firstError() || {};
    const hasError = !isValidUsername && value.username;

    const options = t.update(this.state.formOptions, {
      fields: {
        username: {
          hasError: { $set: hasError },
          error: { $set: errorMessage },
          config: {
            statusIcon: { $set: null },
            statusIconColor: { $set: null },
          },
        },
      },
    });
    this.setState({ formOptions: options, value, isPendingCheck: true });
    this.validateUsername(value.username, hasError);
  };

  handleSubmit = () => {
    Keyboard.dismiss();
    const { apiUser } = this.props;

    if (apiUser && apiUser.id) {
      this.goToNextScreen();
    } else {
      this.proceedWithSignup();
    }
  };

  proceedWithSignup = async () => {
    const { validateUserDetails, walletState } = this.props;
    const value = this._form.getValue();
    if (!value) return;
    await validateUserDetails({ username: value.username });
    if (walletState === USERNAME_OK) {
      this.goToNextScreen();
    }
  };

  componentDidUpdate(prevProps: Props) {
    const { walletState } = this.props;
    if (prevProps.walletState === walletState) return;

    if (walletState === USERNAME_EXISTS || walletState === INVALID_USERNAME) {
      const errorMessage = walletState === USERNAME_EXISTS ? 'Username taken' : 'Invalid username';

      const options = t.update(this.state.formOptions, {
        fields: {
          username: {
            hasError: { $set: true },
            error: { $set: errorMessage },
            config: {
              isLoading: { $set: false },
              statusIcon: { $set: 'close' },
              statusIconColor: { $set: baseColors.fireEngineRed },
            },
          },
        },
      });
      this.setState({ formOptions: options }); // eslint-disable-line
    }

    if (walletState === CHECKING_USERNAME) {
      const options = t.update(this.state.formOptions, {
        fields: {
          username: {
            config: {
              isLoading: { $set: true },
              statusIcon: { $set: null },
            },
          },
        },
      });
      this.setState({ formOptions: options }); // eslint-disable-line
    }

    if (walletState === USERNAME_OK) {
      const options = t.update(this.state.formOptions, {
        fields: {
          username: {
            config: {
              isLoading: { $set: false },
              statusIcon: { $set: 'check' },
              statusIconColor: { $set: baseColors.freshEucalyptus },
            },
          },
        },
      });
      this.setState({ formOptions: options }); // eslint-disable-line
    }
  }

  goToNextScreen() {
    const {
      navigation,
      retry,
      registerOnBackend,
    } = this.props;
    Keyboard.dismiss();
    if (retry) {
      registerOnBackend();
      return;
    }
    if (Platform.OS === 'android') {
      navigation.navigate(PERMISSIONS);
    } else {
      navigation.navigate(SET_WALLET_PIN_CODE);
    }
  }

  renderChooseUsernameScreen() {
    const { value, formOptions } = this.state;
    return (
      <StyledWrapper>
        <LoginForm
          innerRef={node => { this._form = node; }}
          type={formStructure}
          options={formOptions}
          value={value}
          onChange={this.handleChange}
        />
      </StyledWrapper>
    );
  }

  renderWelcomeBackScreen() {
    const { apiUser } = this.props;
    return (
      <Wrapper flex={1} center regularPadding>
        <ProfileImage
          uri={apiUser.profileLargeImage}
          diameter={PROFILE_IMAGE_WIDTH}
          style={{ marginBottom: 47 }}
          userName={apiUser.username}
          initialsSize={fontSizes.extraGiant}
        />
        <UsernameWrapper>
          <Text>Welcome back,</Text>
          <Text>{apiUser.username}.</Text>
        </UsernameWrapper>
        <Paragraph small light center style={{ marginBottom: 40, paddingLeft: 40, paddingRight: 40 }}>
          Your Pillar Wallet is now restored. We are happy to see you again.
        </Paragraph>
        <Button marginBottom="20px" onPress={this.handleSubmit} title="Next" />
      </Wrapper>
    );
  }

  closeModals = () => {
    this.setState({ visibleModal: '' });
  };


  render() {
    const {
      apiUser,
      retry,
      walletState,
      session,
    } = this.props;
    const {
      hasAgreedToTerms,
      hasAgreedToPolicy,
      value,
      formOptions,
      isPendingCheck,
      visibleModal,
    } = this.state;
    const {
      fields: { username: { hasError: usernameHasErrors = false } },
    } = formOptions;

    const isUsernameValid = value && value.username && !usernameHasErrors;
    const isCheckingUsernameAvailability = walletState === CHECKING_USERNAME;
    const canGoNext = !!hasAgreedToTerms && !!hasAgreedToPolicy && !!isUsernameValid && !isCheckingUsernameAvailability
      && !isPendingCheck && session.isOnline;

    const headerProps = !apiUser.walletId
      ? {
        centerItems: [
          {
            title: 'Choose username',
          },
        ],
      }
      : {
        default: true,
        floating: true,
        transparent: true,
      };

    return (
      <ContainerWithHeader
        noBack={!!retry}
        headerProps={headerProps}
        backgroundColor={baseColors.white}
        keyboardAvoidFooter={!apiUser.walletId && (
          <NextFooter
            onNextPress={this.handleSubmit}
            nextDisabled={!canGoNext}
            wrapperStyle={{ paddingBottom: 15, paddingTop: 15 }}
          >
            <Checkbox
              onPress={() => { this.setState({ hasAgreedToTerms: !hasAgreedToTerms }); }}
              small
              lightText
              darkCheckbox
              wrapperStyle={{ marginBottom: 16 }}
            >
              <CheckboxText>
                {'I have read, understand, and agree to the '}
                <StyledTextLink
                  onPress={() => { this.setState({ visibleModal: TERMS_OF_USE_MODAL }); }}
                >
                  Terms of Use
                </StyledTextLink>
              </CheckboxText>
            </Checkbox>
            <Checkbox
              onPress={() => { this.setState({ hasAgreedToPolicy: !hasAgreedToPolicy }); }}
              small
              lightText
              darkCheckbox
            >
              <CheckboxText>
                {'I have read, understand, and agree to the '}
                <StyledTextLink
                  onPress={() => { this.setState({ visibleModal: PRIVACY_POLICY_MODAL }); }}
                >
                  Privacy policy
                </StyledTextLink>
              </CheckboxText>
            </Checkbox>
          </NextFooter>
        )}
      >
        <ContentWrapper>
          {!apiUser.walletId && this.renderChooseUsernameScreen()}
          {apiUser.walletId && this.renderWelcomeBackScreen()}
        </ContentWrapper>

        <HTMLContentModal
          isVisible={visibleModal === TERMS_OF_USE_MODAL}
          modalHide={this.closeModals}
          htmlEndpoint="terms_of_service"
        />

        <HTMLContentModal
          isVisible={visibleModal === PRIVACY_POLICY_MODAL}
          modalHide={this.closeModals}
          htmlEndpoint="privacy_policy"
        />

      </ContainerWithHeader>
    );
  }
}

const mapStateToProps = ({
  wallet: { walletState, onboarding: { apiUser } },
  session: { data: session },
}) => ({
  walletState,
  apiUser,
  session,
});

const mapDispatchToProps = (dispatch) => ({
  validateUserDetails: (user: Object) => dispatch(validateUserDetailsAction(user)),
  registerOnBackend: () => dispatch(registerOnBackendAction()),
});

export default connect(mapStateToProps, mapDispatchToProps)(NewProfile);
