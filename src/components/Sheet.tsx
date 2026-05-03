import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
  type BottomSheetModalProps,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '@/design/ThemeProvider';

type Props = Omit<BottomSheetModalProps, 'children' | 'backgroundStyle' | 'handleIndicatorStyle'> & {
  children: ReactNode;
};

export const Sheet = forwardRef<BottomSheetModal, Props>(function Sheet(
  { children, snapPoints = ['40%', '85%'], ...rest },
  ref,
) {
  const theme = useTheme();
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
    ),
    [],
  );
  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.colors.surface }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
      {...rest}
    >
      <BottomSheetView style={styles.body}>{children}</BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({ body: { padding: 16, gap: 12 } });
