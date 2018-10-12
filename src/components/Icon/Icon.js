// @flow
import * as React from 'react';
import { createIconSet } from 'react-native-vector-icons';
import { Platform } from 'react-native';

const glyphMap = {
  chat: '\uE801',
  back: '\uE819',
  close: '\uE802',
  help: '\uE874',
  'down-arrow': '\uE805',
  remove: '\uE806',
  mute: '\uE804',
  'up-arrow': '\uE808',
  search: '\uE873',
  settings: '\uE809',
  warning: '\uE80A',
  check: '\uE80B',
  qrcode: '\uE81C',
  send: '\uF1D9',
  all: '\uE80D',
  social: '\uE80E',
  pending: '\uE80F',
  more: '\uE810',
  received: '\uE811',
  sent: '\uE812',
  camera: '\uE813',
  'info-circle': '\uE815',
  'tick-circle': '\uE816',
  'warning-circle': '\uE817',
  'chevron-right': '\uE818',
  'send-message': '\uE832',
  'send-asset': '\uE833',
  'send-attachment': '\uE834',
  'chat-filled': '\uE81B',
  ethereum: '\uE844',
  litecoin: '\uE844',
  pound: '\uE846',
  bitcoin: '\uE847',
  'turn-off': '\uE81D',
  'pending-circle': '\uE822',
  'connection-circle': '\uE823',
  flip: '\uE825',
  'flash-off': '\uE826',
  'flash-on': '\uE828',
  gallery: '\uE827',
};

type Props = {
  name: string,
  style?: Object,
}

const fontName = Platform.OS === 'ios' ? 'fontello' : 'PillarIcons';

const IconSet = createIconSet(glyphMap, fontName);

const Icon = (props: Props) => {
  const { name, style } = props;
  return <IconSet name={name} style={style} />;
};

export default Icon;
