import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';
import { Button } from '../Button';

describe('<Button/>', () => {
  const props = {
    text: 'DONE' as const,
    onPress: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders correctly', async () => {
    await ReactTestRenderer.act(() => {
      ReactTestRenderer.create(<Button {...props} />);
    });
  });

  test('test snapshot', async ()=>{
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(()=>{
      tree = ReactTestRenderer.create(<Button {...props} />);
    })
    expect(tree.toJSON()).toMatchSnapshot();
  })

  it('calls onPress when pressed', async () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<Button {...props} />);
    });

    const pressableOpacity = tree.root.findByType(TouchableOpacity);

    await ReactTestRenderer.act(() => {
      pressableOpacity.props.onPress();
    });

    expect(props.onPress).toHaveBeenCalledTimes(1);
  });
});
