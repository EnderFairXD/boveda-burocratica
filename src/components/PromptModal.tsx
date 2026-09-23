import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';

interface PromptModalProps {
  visible: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}

export function PromptModal({
  visible,
  title,
  placeholder,
  initialValue = '',
  confirmLabel = 'Continuar',
  onCancel,
  onConfirm,
}: PromptModalProps) {
  const [value, setValue] = useState(initialValue);
  const [prevVisible, setPrevVisible] = useState(visible);

  // Reset the field whenever the modal transitions to visible. Adjusting
  // state during render (React's recommended pattern) instead of in an
  // effect avoids an extra render pass.
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setValue(initialValue);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/70 px-6">
        <View className="w-full max-w-sm rounded-3xl bg-slate-900 p-6 shadow-lg">
          <Text className="mb-4 text-lg font-semibold text-white">{title}</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor="#64748b"
            autoFocus
            className="mb-5 rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-base text-white"
          />
          <View className="flex-row justify-end gap-3">
            <Pressable onPress={onCancel} className="rounded-full px-4 py-2 active:bg-slate-800">
              <Text className="font-semibold text-slate-300">Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={() => value.trim() && onConfirm(value.trim())}
              className="rounded-full bg-blue-600 px-5 py-2 shadow-md active:bg-blue-700"
            >
              <Text className="font-semibold text-white">{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
