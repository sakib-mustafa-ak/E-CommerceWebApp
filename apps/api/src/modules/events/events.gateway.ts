import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';

export interface OrderStaffPresence {
  staffId: string;
  staffName: string;
  joinedAt: string;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // In-memory presence map: orderId -> Map<socketId, OrderStaffPresence>
  private orderRoomStaff = new Map<string, Map<string, OrderStaffPresence>>();

  handleConnection(client: Socket) {
    // Client connected
  }

  handleDisconnect(client: Socket) {
    // Remove disconnected socket from all order presence rooms
    for (const [orderId, socketMap] of this.orderRoomStaff.entries()) {
      if (socketMap.has(client.id)) {
        socketMap.delete(client.id);
        this.broadcastOrderPresence(orderId);
      }
    }
  }

  // Real-time Room Join (e.g. 'sector:paikari', 'order:123', 'user:abc')
  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    client.join(data.room);
    return { status: 'joined', room: data.room };
  }

  // Staff joins specific order fulfillment screen
  @SubscribeMessage('joinOrderFulfillment')
  handleJoinOrderFulfillment(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      orderId: string;
      staffId: string;
      staffName: string;
    },
  ) {
    const room = `order:${data.orderId}`;
    client.join(room);

    if (!this.orderRoomStaff.has(data.orderId)) {
      this.orderRoomStaff.set(data.orderId, new Map());
    }

    const socketMap = this.orderRoomStaff.get(data.orderId)!;
    socketMap.set(client.id, {
      staffId: data.staffId,
      staffName: data.staffName,
      joinedAt: new Date().toISOString(),
    });

    this.broadcastOrderPresence(data.orderId);
    return { status: 'joined', orderId: data.orderId };
  }

  // Staff leaves order fulfillment screen
  @SubscribeMessage('leaveOrderFulfillment')
  handleLeaveOrderFulfillment(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    const room = `order:${data.orderId}`;
    client.leave(room);

    const socketMap = this.orderRoomStaff.get(data.orderId);
    if (socketMap && socketMap.has(client.id)) {
      socketMap.delete(client.id);
      this.broadcastOrderPresence(data.orderId);
    }

    return { status: 'left', orderId: data.orderId };
  }

  private broadcastOrderPresence(orderId: string) {
    const socketMap = this.orderRoomStaff.get(orderId);
    const activeStaff: OrderStaffPresence[] = [];

    if (socketMap) {
      const seenStaffIds = new Set<string>();
      for (const presence of socketMap.values()) {
        if (!seenStaffIds.has(presence.staffId)) {
          seenStaffIds.add(presence.staffId);
          activeStaff.push(presence);
        }
      }
    }

    if (this.server) {
      this.server.to(`order:${orderId}`).emit('orderStaffPresence', {
        orderId,
        activeStaff,
      });
    }
  }

  // Staff Line Item Fulfill Event (Rule 6: First action wins, broadcast outcome live)
  @SubscribeMessage('fulfillLineItem')
  handleFulfillLineItem(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      orderId: string;
      itemId: string;
      staffId: string;
      staffName: string;
      status: string;
      confirmedQuantity: number;
    },
  ) {
    // Broadcast outcome immediately to all staff and customers viewing this order
    this.broadcastLineItemFulfilled(data.orderId, data);
    return { status: 'acknowledged' };
  }

  broadcastLineItemFulfilled(orderId: string, payload: any) {
    if (this.server) {
      this.server.to(`order:${orderId}`).emit('lineItemFulfilled', payload);
      this.server.emit('adminDashboardUpdate', { orderId, type: 'LINE_FULFILLED', payload });
    }
  }

  broadcastPriceOverridden(orderId: string, payload: any) {
    if (this.server) {
      this.server.to(`order:${orderId}`).emit('linePriceOverridden', payload);
    }
  }

  broadcastFinalMemoPublished(orderId: string, payload: any) {
    if (this.server) {
      this.server.to(`order:${orderId}`).emit('finalMemoPublished', payload);
      this.server.emit('adminDashboardUpdate', { orderId, type: 'FINAL_MEMO_PUBLISHED', payload });
    }
  }

  broadcastOrderUpdate(orderId: string, payload: any) {
    if (this.server) {
      this.server.to(`order:${orderId}`).emit('orderStatusChanged', payload);
      this.server.emit('adminDashboardUpdate', { orderId, type: 'STATUS_CHANGED', payload });
    }
  }

  broadcastCancellationRequested(orderId: string, payload: any) {
    if (this.server) {
      this.server.to(`order:${orderId}`).emit('cancellationRequested', payload);
      this.server.emit('adminDashboardUpdate', { orderId, type: 'CANCELLATION_REQUESTED', payload });
    }
  }

  broadcastCancellationHandled(orderId: string, payload: any) {
    if (this.server) {
      this.server.to(`order:${orderId}`).emit('cancellationHandled', payload);
      this.server.emit('adminDashboardUpdate', { orderId, type: 'CANCELLATION_HANDLED', payload });
    }
  }

  broadcastItemsAdded(orderId: string, payload: any) {
    if (this.server) {
      this.server.to(`order:${orderId}`).emit('itemsAddedToOrder', payload);
    }
  }

  broadcastTierUpdate(customerId: string, payload: any) {
    if (this.server) {
      this.server.to(`user:${customerId}`).emit('tierRecalculated', payload);
    }
  }
}
