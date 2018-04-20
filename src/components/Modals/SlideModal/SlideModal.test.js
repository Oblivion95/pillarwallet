// @flow
import * as React from 'react';
import { Text } from 'react-native';
import renderer from 'react-test-renderer';
import { shallow } from 'enzyme';
import SlideModal from '../SlideModal';

describe('Slide Modal', () => {
  it('should render SlideModal correctly', () => {
    const component = renderer.create(<SlideModal title="title" isVisible />).toJSON();
    expect(component).toMatchSnapshot();
  });

  it('should render SlideModal with content', () => {
    const ChildContent = () => <Text>Test</Text>;
    const wrapper = shallow(<SlideModal title="title" isVisible><ChildContent /></SlideModal>);
    expect(wrapper.find(ChildContent)).toHaveLength(1);
  });

  it('should close modal on dismiss', (done) => {
    const onDismiss = jest.fn();
    const wrapper = shallow(<SlideModal title="title" isVisible onDismiss={onDismiss} />);
    const dimissBtn = wrapper.find({ title: 'dismiss' });
    dimissBtn.simulate('Press');
    const timeout = setTimeout(() => {
      clearTimeout(timeout);
      expect(onDismiss).toHaveBeenCalled();
      expect(wrapper.state().isVisible).toBeFalsy();
      done();
    }, 1000);
  });
});
