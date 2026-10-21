# Manrope

`Manrope-VariableFont_wght.woff2` is the original font provided in the repository root by the user. It was moved here; the root copy was removed.

`Manrope-Regular.ttf`, `Manrope-SemiBold.ttf` and `Manrope-Bold.ttf` are static instances of that font at weights 400, 600 and 700. They were generated with fontTools (`instantiateVariableFont`, `updateFontNames=True`, `flavor = None`). The original glyph designs and attribution are preserved. The app loads the three TTF files through the map-based `expo-font` API supported by Expo SDK 57 on Android, iOS and web. WOFF2 is retained as the original source asset and is not imported into the app bundle.

`TypographyProvider`, `AppText` and `AppTextInput` apply the font consistently to headings, body text, buttons, fields and amounts. The `fontStyle` helper maps existing weight styles to the matching static face and resets the rendered weight to avoid synthetic bolding. If loading fails, the app remains usable with the system font. Icon fonts are independent.

Format support follows [Expo's font documentation](https://docs.expo.dev/develop/user-interface/fonts/). Keep the font's embedded attribution and any accompanying upstream license when redistributing it.
