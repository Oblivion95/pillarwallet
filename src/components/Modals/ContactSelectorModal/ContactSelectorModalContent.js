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
import { Keyboard, KeyboardAvoidingView, FlatList } from 'react-native';
import { useDispatch } from 'react-redux';
import Clipboard from '@react-native-community/clipboard';
import SafeAreaView from 'react-native-safe-area-view';
import styled from 'styled-components/native';
import { useTranslationWithPrefix } from 'translations/translate';
import { useDebounce } from 'use-debounce';

// Actions
import { addContactAction } from 'actions/contactsActions';

// Components
import { Spacing } from 'components/layout/Layout';
import Button from 'components/core/Button';
import ContactDetailsModal from 'components/ContactDetailsModal';
import ContactListItem from 'components/lists/ContactListItem';
import Modal from 'components/Modal';
import SearchBar from 'components/SearchBar';
import Spinner from 'components/Spinner';

// Selectors
import { useRootSelector, activeAccountAddressSelector } from 'selectors';

// Utils
import { addressesEqual } from 'utils/assets';
import { filterContacts, getContactKey } from 'utils/contacts';
import { useNameValid, isValidAddress } from 'utils/validators';
import { spacing } from 'utils/variables';

// Types
import type { Contact } from 'models/Contact';
import type { Chain } from 'models/Chain';

// Local
import SendWarning from './SendWarning';

type Props = {|
  contacts: Contact[],
  onSelectContact: (contact: Contact) => mixed,
  query: string,
  onQueryChange: (query: string) => mixed,
  chain?: ?Chain,
|};

/**
 * Content of contact selector modal, that can be used in standalone screen.
 *
 * Screen using it should implement it's own header.
 */
const ContactSelectorModalContent = ({ chain, contacts = [], onSelectContact, query, onQueryChange }: Props) => {
  const { t, tRoot } = useTranslationWithPrefix('contactSelector');
  const dispatch = useDispatch();

  const activeAccountAddress = useRootSelector(activeAccountAddressSelector);

  const [warningAccepted, setWarningAccepted] = React.useState(false);
  const [debounceQuery] = useDebounce(query, 1000);

  const handleAddToContactsPress = async (contact: Contact) => {
    Modal.open(() => (
      <ContactDetailsModal
        title={tRoot('title.addNewContact')}
        contact={contact}
        contacts={contacts}
        onSave={(savedContact: Contact) => {
          dispatch(addContactAction(savedContact));
          onSelectContact(savedContact);
        }}
      />
    ));
  };

  const handlePaste = async () => {
    Keyboard.dismiss();
    const value = await Clipboard.getString();
    onQueryChange(value);
  };

  const items = filterContacts(contacts, query);

  const validInputQuery = useNameValid(debounceQuery, chain);
  const { isLoading, data } = validInputQuery;

  const getValidationError = () => {
    if (addressesEqual(data?.address || query, activeAccountAddress)) {
      return t('error.cannotSendToYourself');
    }

    if (query && !items.length && !isValidAddress(query) && !data) {
      return t('error.incorrectAddress');
    }

    return null;
  };

  const getCustomContact = (): ?Contact => {
    if (data) {
      const { address, name } = data;
      return { ethAddress: address, name };
    }

    const hasExistingContact = !!filterContacts(contacts, query).length;
    if (hasExistingContact || !isValidAddress(query)) return null;

    return { ethAddress: query, name: '' };
  };

  const errorMessage = getValidationError();
  const customContact = getCustomContact();

  const renderItem = (contact: Contact) => {
    return <ContactListItem contact={contact} onPress={() => onSelectContact(contact)} />;
  };

  const renderActionButtons = () => {
    if (errorMessage || isLoading) {
      return <Button title={isLoading ? tRoot('fetchingAddress') : errorMessage} disabled size="large" />;
    }

    if (customContact) {
      if (!warningAccepted) return null;

      return (
        <>
          <Button title={t('button.addContact')} onPress={() => handleAddToContactsPress(customContact)} size="large" />
          <Spacing h={spacing.small} />
          <Button title={t('button.skip')} onPress={() => onSelectContact(customContact)} size="large" variant="text" />
        </>
      );
    }

    return <Button title={tRoot('button.paste')} onPress={handlePaste} size="large" />;
  };

  const renderSendWarning = () => {
    if (!errorMessage && customContact) {
      return (
        <SendWarning
          warningAccepted={warningAccepted}
          setWarningAccepted={setWarningAccepted}
          style={styles.sendWarning}
        />
      );
    }

    return null;
  };

  return (
    <KeyboardAvoidingView behavior="height" style={styles.container}>
      <SearchBar
        query={query}
        onQueryChange={onQueryChange}
        placeholder={tRoot('label.addressEnsUsername')}
        error={!!errorMessage}
        autoFocus
      />

      {isLoading && <Spinner size={40} />}

      {renderSendWarning()}

      <FlatList
        data={items}
        renderItem={({ item }) => renderItem(item)}
        keyExtractor={(contact) => getContactKey(contact)}
        contentContainerStyle={styles.flatListContantContainer}
        keyboardShouldPersistTaps="always"
      />

      <ActionButtonsContainer>{renderActionButtons()}</ActionButtonsContainer>
    </KeyboardAvoidingView>
  );
};

export default ContactSelectorModalContent;

const styles = {
  container: {
    flex: 1,
  },
  flatListContantContainer: {
    paddingVertical: spacing.small,
  },
  sendWarning: {
    marginTop: spacing.large,
  },
};

const ActionButtonsContainer = styled(SafeAreaView)`
  padding: ${spacing.small}px ${spacing.large}px ${spacing.mediumLarge}px;
`;
