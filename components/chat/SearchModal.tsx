import React from 'react';
import { Modal, StyleSheet, SafeAreaView, View, Pressable, Platform } from 'react-native';
import { MessageSearch } from './MessageSearch';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useAppContext } from '@/hooks/AppContext';
import { ThemedText } from '@/components/common/ThemedText';
import { BlurView } from 'expo-blur';

interface SearchModalProps {
    visible: boolean;
    onClose: () => void;
    chatId?: string;
}

export const SearchModal = ({ visible, onClose, chatId }: SearchModalProps) => {
    const { theme } = useAppContext();

    const isTransparent = Platform.OS === 'ios';

    const renderBackground = () => {
        if (Platform.OS === 'ios') {
            return <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />;
        }
        return null;
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={isTransparent}
        >
            <View style={[
                styles.container,
                Platform.OS === 'android' && { backgroundColor: theme.colors.background }
            ]}>
                {renderBackground()}

                <SafeAreaView style={styles.safeArea}>
                    <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                        <Pressable onPress={onClose} style={styles.backButton}>
                            <IconSymbol name="chevron-back" size={24} color={theme.colors.primary} />
                        </Pressable>
                        <ThemedText style={styles.title}>Search Messages</ThemedText>
                        <View style={styles.placeholder} />
                    </View>

                    <View style={styles.content}>
                        <MessageSearch chatId={chatId} onClose={onClose} />
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    title: {
        fontSize: 17,
        fontWeight: '600',
        flex: 1,
        textAlign: 'center',
    },
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
    },
}); 