# React Native Pointer Events Guide

## Overview

This guide explains the proper usage of `pointerEvents` in React Native 0.81+ and provides best practices for touch interaction handling in the Clipper mobile app.

## ⚠️ Deprecation Notice

As of React Native 0.81, using `pointerEvents` as a **component prop** is **DEPRECATED**.

### ❌ Deprecated Usage (DO NOT USE)

```tsx
// OLD - This is deprecated and will cause warnings/errors
<View pointerEvents="none">
  <Text>This is disabled</Text>
</View>

<TouchableOpacity pointerEvents="box-only">
  <View>
    <Text>Clickable</Text>
  </View>
</TouchableOpacity>
```

### ✅ Correct Usage (React Native 0.81+)

```tsx
// NEW - Use pointerEvents in the style prop
<View style={{ pointerEvents: 'none' }}>
  <Text>This is disabled</Text>
</View>

<TouchableOpacity style={{ pointerEvents: 'box-only' }}>
  <View>
    <Text>Clickable</Text>
  </View>
</TouchableOpacity>
```

## Pointer Events Values

The `pointerEvents` style property accepts four values:

### 1. `auto` (default)
- The view and its children can receive touch events
- Standard behavior for interactive components

```tsx
<View style={{ pointerEvents: 'auto' }}>
  <TouchableOpacity onPress={handlePress}>
    <Text>Clickable Button</Text>
  </TouchableOpacity>
</View>
```

### 2. `none`
- The view and its children cannot receive touch events
- Touch events pass through to views behind it
- Useful for overlays that should not block interaction

```tsx
// Loading overlay that doesn't block background interaction
<View style={{ 
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.3)',
  pointerEvents: 'none' 
}}>
  <ActivityIndicator />
</View>
```

### 3. `box-none`
- The view itself cannot receive touch events
- Its children CAN receive touch events
- Useful for container views that wrap interactive elements

```tsx
// Container that doesn't intercept touches but children are interactive
<View style={{ 
  flex: 1,
  pointerEvents: 'box-none' 
}}>
  <TouchableOpacity onPress={handlePress}>
    <Text>This button works</Text>
  </TouchableOpacity>
</View>
```

### 4. `box-only`
- The view itself CAN receive touch events
- Its children CANNOT receive touch events
- Useful when you want the container to handle all touches

```tsx
// Container handles all touches, children are display-only
<TouchableOpacity 
  style={{ pointerEvents: 'box-only' }}
  onPress={handleCardPress}
>
  <Image source={thumbnail} />
  <Text>Title</Text>
  {/* These elements can't be pressed individually */}
</TouchableOpacity>
```

## Common Use Cases

### Disabled State

```tsx
// Disabled button that can't be pressed
<TouchableOpacity 
  style={{ 
    pointerEvents: isDisabled ? 'none' : 'auto',
    opacity: isDisabled ? 0.5 : 1 
  }}
  onPress={handlePress}
>
  <Text>Submit</Text>
</TouchableOpacity>
```

### Modal Overlays

```tsx
// Modal that blocks background interaction
<View style={{
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  pointerEvents: 'auto' // Blocks touches to background
}}>
  <View style={{ backgroundColor: 'white', padding: 20 }}>
    <Text>Modal Content</Text>
  </View>
</View>
```

### Nested Interactive Elements

```tsx
// Card with multiple interactive areas
<View style={{ pointerEvents: 'box-none' }}>
  <TouchableOpacity onPress={handleCardPress}>
    <Text>Card Title</Text>
  </TouchableOpacity>
  
  <TouchableOpacity onPress={handleButtonPress}>
    <Text>Action Button</Text>
  </TouchableOpacity>
</View>
```

### Loading States

```tsx
// Disable all interactions during loading
<View style={{ 
  flex: 1,
  pointerEvents: isLoading ? 'none' : 'auto' 
}}>
  {/* Your content */}
</View>
```

## Integration with NativeWind/Tailwind

You can combine `pointerEvents` with other styles using NativeWind:

```tsx
// Using className with inline style for pointerEvents
<View 
  className="flex-1 bg-white p-4"
  style={{ pointerEvents: isDisabled ? 'none' : 'auto' }}
>
  {/* Content */}
</View>

// Or use style array
<View 
  style={[
    tw`flex-1 bg-white p-4`,
    { pointerEvents: isDisabled ? 'none' : 'auto' }
  ]}
>
  {/* Content */}
</View>
```

## Best Practices

1. **Always use `pointerEvents` in the `style` prop**, never as a direct prop
2. **Combine with visual feedback**: When disabling interaction, also update opacity or colors
3. **Test on both platforms**: iOS and Android may have slight behavioral differences
4. **Use conditional styles**: Make `pointerEvents` dynamic based on state
5. **Prefer semantic values**: Use `'auto'` and `'none'` for clarity unless you need specific behavior
6. **Document complex interactions**: Add comments when using `'box-none'` or `'box-only'`

## Platform Differences

### iOS
- All pointer event values work consistently
- Touch events respect the view hierarchy strictly

### Android
- Behavior is generally consistent with iOS
- Some older Android versions may have slight differences with `'box-none'`

### Web (React Native Web)
- `'box-none'` implementation may not perfectly match native behavior
- Test web builds carefully if your app targets web platform
- Consider using CSS pointer-events for web-specific code

## ESLint Integration

Our ESLint configuration is prepared for future enforcement of pointer events best practices. Once a suitable plugin like `eslint-plugin-react-native` is added, you can enable a rule to prevent the deprecated prop syntax:

```json
{
  "rules": {
    "react-native/no-pointer-events-prop": "error"
  }
}
```

This would show an error if you try to use:
```tsx
<View pointerEvents="none"> // ❌ ESLint error
```

And suggest using:
```tsx
<View style={{ pointerEvents: 'none' }}> // ✅ Correct
```

**Current Status**: The configuration is prepared in `eslint.config.js`, but the rule is not yet active. The codebase audit confirmed zero deprecated usage, so this is a preventive measure for future development.

## Testing Touch Interactions

When working with `pointerEvents`, always test:

1. **Manual Testing**:
   - Test on both iOS and Android devices/simulators
   - Verify disabled states don't respond to touches
   - Ensure overlays properly block or allow background interaction
   - Test gestures (swipe, long-press) in addition to taps

2. **Automated Testing**:
   ```tsx
   import { render, fireEvent } from '@testing-library/react-native';
   
   it('should not respond to press when disabled', () => {
     const onPress = jest.fn();
     const { getByText } = render(
       <TouchableOpacity 
         style={{ pointerEvents: 'none' }}
         onPress={onPress}
       >
         <Text>Disabled Button</Text>
       </TouchableOpacity>
     );
     
     fireEvent.press(getByText('Disabled Button'));
     expect(onPress).not.toHaveBeenCalled();
   });
   ```

## Migration Checklist

If you find legacy `pointerEvents` prop usage:

- [ ] Identify all instances using: `grep -r "pointerEvents=" mobile/`
- [ ] Move `pointerEvents` from prop to `style` object
- [ ] Test affected components on iOS and Android
- [ ] Verify touch interactions work as expected
- [ ] Run ESLint to ensure no deprecated usage remains
- [ ] Update any related tests

## Additional Resources

- [React Native View Props](https://reactnative.dev/docs/view#pointerevents)
- [React Native 0.81 Release Notes](https://reactnative.dev/blog/2025/08/12/react-native-0.81)
- [Touch Events in React Native](https://reactnative.dev/docs/handling-touches)
- [Gesture Handler Documentation](https://docs.swmansion.com/react-native-gesture-handler/)

## Questions?

If you encounter issues with pointer events or touch interactions:
1. Check this guide for common patterns
2. Test on both iOS and Android
3. Review the ESLint error messages for guidance
4. Consult the team or create an issue with reproduction steps

---

**Last Updated**: December 2024  
**React Native Version**: 0.81.5  
**Author**: Clipper Development Team
