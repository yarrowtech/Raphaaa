import React from 'react';
import { Text, TextInput } from 'react-native';
import { typography } from './typography';

const globalFontStyle = {
  fontFamily: typography.fontFamily.regular,
};

function applyGlobalFont(Component) {
  if (Component.__outfitFontApplied || !Component.render) {
    return;
  }

  const originalRender = Component.render;

  Component.render = function renderWithGlobalFont(...args) {
    const element = originalRender.apply(this, args);

    return React.cloneElement(element, {
      style: [globalFontStyle, element.props.style],
    });
  };

  Component.__outfitFontApplied = true;
}

applyGlobalFont(Text);
applyGlobalFont(TextInput);
