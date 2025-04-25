import { db } from '../db';
import { chats, chatParticipants, messages, messageReads, users } from '../schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { Chat, Media, Message } from '@/interfaces/chatTypes';
import { IChatRepository, ChatError } from '@/interfaces/chatRepository';

export class ChatRepository implements IChatRepository {
  async createChat(participantIds: string[]): Promise<Chat | null> {
    try {
      const chatId = `chat${Date.now()}`;

      // Crear chat y participantes en una transacción
      await db.transaction(async (tx) => {
        await tx.insert(chats).values({ id: chatId });

        const participantValues = participantIds.map(userId => ({
          id: `cp-${chatId}-${userId}`,
          chatId,
          userId,
        }));
        await tx.insert(chatParticipants).values(participantValues);
      });

      // Obtener información de los participantes
      const participantUsers = await db
        .select()
        .from(users)
        .where(inArray(users.id, participantIds));

      return {
        id: chatId,
        participants: participantUsers.map(({ id, name, avatar, status }) => ({
          id, name, avatar, status
        })),
        messages: [],
      };
    } catch (error) {
      throw new ChatError('Error al crear el chat', 'CREATE_CHAT_ERROR');
    }
  }

  async loadChats(userId: string): Promise<Chat[]> {
    try {
      // Obtener chats del usuario
      const userChats = await db
        .select({ chatId: chatParticipants.chatId })
        .from(chatParticipants)
        .where(eq(chatParticipants.userId, userId));

      if (!userChats?.length) return [];

      const chatIds = userChats.map(c => c.chatId);

      // Obtener datos de participantes y mensajes en paralelo
      const [chatData, messagesWithReads] = await Promise.all([
        this.getChatParticipants(chatIds),
        this.getChatMessages(chatIds)
      ]);

      return this.processChatData(chatIds, chatData, messagesWithReads);
    } catch (error) {
      throw new ChatError('Error al cargar los chats', 'LOAD_CHATS_ERROR');
    }
  }

  private async getChatParticipants(chatIds: string[]) {
    return db
      .select({
        chatId: chatParticipants.chatId,
        participantId: chatParticipants.userId,
        name: users.name,
        avatar: users.avatar,
        status: users.status,
      })
      .from(chatParticipants)
      .innerJoin(users, eq(chatParticipants.userId, users.id))
      .where(inArray(chatParticipants.chatId, chatIds));
  }

  private async getChatMessages(chatIds: string[]) {
    return db
      .select({
        message: messages,
        reads: messageReads,
      })
      .from(messages)
      .leftJoin(messageReads, eq(messages.id, messageReads.messageId))
      .where(inArray(messages.chatId, chatIds))
      .orderBy(desc(messages.timestamp));
  }

  private processChatData(
    chatIds: string[],
    chatData: any[],
    messagesWithReads: any[]
  ): Chat[] {
    return chatIds.map(chatId => {
      // Crear un Map para evitar duplicados usando el ID del mensaje como clave
      const messageMap = new Map();
      
      messagesWithReads
        .filter(m => m.message.chatId === chatId)
        .forEach(({ message, reads }) => {
          const existingMessage = messageMap.get(message.id);
          if (!existingMessage) {
            messageMap.set(message.id, {
              ...message,
              status: message.status as 'sent' | 'delivered' | 'read',
              reads: reads ? [{ userId: reads.userId, timestamp: reads.timestamp }] : [],
            });
          } else if (reads) {
            // Si ya existe el mensaje y hay nuevas lecturas, las agregamos al array de reads
            existingMessage.reads.push({ userId: reads.userId, timestamp: reads.timestamp });
          }
        });

      const chatMessages = Array.from(messageMap.values());

      const participants = chatData
        .filter(c => c.chatId === chatId)
        .map(c => ({
          id: c.participantId,
          name: c.name,
          avatar: c.avatar,
          status: c.status,
        }));

      const lastMessage = chatMessages.sort((a, b) => b.timestamp - a.timestamp)[0];
      
      return {
        id: chatId,
        participants,
        messages: chatMessages.sort((a, b) => a.timestamp - b.timestamp),
        lastMessage,
      };
    });
  }

  async sendMessage(
    chatId: string,
    text: string,
    senderId: string,
    media?: Media | null
  ): Promise<Message> {
    if (!text.trim() && !media) {
      throw new ChatError('El mensaje no puede estar vacío', 'INVALID_MESSAGE');
    }

    try {
      const messageId = `msg${Date.now()}`;
      const timestamp = Date.now();

      const newMessage: Message = {
        id: messageId,
        chatId,
        senderId,
        text,
        timestamp,
        status: 'sent',
        mediaType: media?.type,
        mediaUrl: media?.uri,
        mediaSize: media?.size,
        mediaName: media?.name,
        reads: [],
      };

      await db.insert(messages).values(newMessage);

      // Simular el cambio de estado a delivered después de 1 segundo
      setTimeout(async () => {
        try {
          await db.update(messages)
            .set({ status: 'delivered' })
            .where(eq(messages.id, messageId));
        } catch (error) {
          console.error('Error al actualizar el estado del mensaje a delivered:', error);
        }
      }, 1000);

      return newMessage;
    } catch (error) {
      throw new ChatError('Error al enviar el mensaje', 'SEND_MESSAGE_ERROR');
    }
  }


  async deleteMessage(messageId: string, chatId: string): Promise<boolean> {
    try {
      await db.delete(messages)
        .where(eq(messages.id, messageId));
      return true;
    } catch (error) {
      throw new ChatError('Error al eliminar el mensaje', 'DELETE_MESSAGE_ERROR');
    }
  }

  async markMessagesAsRead(chatId: string, userId: string, messageIds: string[]): Promise<void> {
    try {
      const timestamp = Date.now();
      
      // Insertar registros de lectura para cada mensaje
      for (const messageId of messageIds) {
        await db.insert(messageReads).values({
          id: `read${Date.now()}_${messageId}`,
          messageId,
          userId,
          timestamp,
        });

        // Actualizar el estado del mensaje a 'read'
        await db.update(messages)
          .set({ status: 'read' })
          .where(eq(messages.id, messageId));
      }
    } catch (error) {
      throw new ChatError('Error al marcar mensajes como leídos', 'MARK_MESSAGES_READ_ERROR');
    }
  }
} 