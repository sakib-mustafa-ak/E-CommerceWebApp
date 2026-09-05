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

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    // Client connected
  }

  handleDisconnect(client: Socket) {
    // Client disconnected
  }

  // Real-time Sector Room Join (e.g. 'sector:paikari', 'sector:wholesale', 'order:123')
  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    client.join(data.room);
    return { status: 'joined', room: data.room };
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
    },
  ) {
    // Broadcast outcome immediately to all staff viewing this order room
    this.server.to(`order:${data.orderId}`).emit('lineItemFulfilled', {
      orderId: data.orderId,
      itemId: data.itemId,
      fulfilledByStaffId: data.staffId,
      fulfilledByStaffName: data.staffName,
      fulfilledAt: new Date().toISOString(),
    });

    return { status: 'acknowledged' };
  }

  // Broadcast price updates, tier changes, or order status changes platform-wide
  broadcastOrderUpdate(orderId: string, payload: any) {
    if (this.server) {
      this.server.to(`order:${orderId}`).emit('orderStatusChanged', payload);
      this.server.emit('adminDashboardUpdate', { orderId, payload });
    }
  }

  broadcastTierUpdate(customerId: string, payload: any) {
    if (this.server) {
      this.server.to(`user:${customerId}`).emit('tierRecalculated', payload);
    }
  }
}
