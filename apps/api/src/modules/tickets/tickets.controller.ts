import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AccountTypeGuard } from '../../common/guards/account-type.guard';
import { RequireAccountTypes } from '../../common/decorators/account-types.decorator';
import {
  AccountType,
  CreateSupportTicketDto,
  TicketReplyDto,
  UpdateTicketStatusDto,
} from '@siam-aqua/shared-types';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  async createTicket(@Req() req: any, @Body() dto: CreateSupportTicketDto) {
    const userId = req.user?.id || undefined;
    return this.ticketsService.createTicket(userId, dto);
  }

  @Get('my-tickets')
  @UseGuards(JwtAuthGuard)
  async getMyTickets(@Req() req: any) {
    return this.ticketsService.getMyTickets(req.user.id);
  }

  @Get('detail/:id')
  async getTicketById(@Param('id') id: string) {
    return this.ticketsService.getTicketById(id);
  }

  @Post(':id/reply')
  async replyTicket(@Param('id') id: string, @Req() req: any, @Body() dto: TicketReplyDto) {
    const senderId = req.user?.id || undefined;
    const senderName = req.user?.name || 'Customer';
    const senderRole =
      req.user?.accountType === AccountType.SUPER_ADMIN || req.user?.accountType === AccountType.STAFF
        ? 'STAFF'
        : 'CUSTOMER';
    return this.ticketsService.replyTicket(id, senderId, senderName, senderRole, dto);
  }

  @Get('admin/queue')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async getAdminTickets(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('priority') priority?: string,
  ) {
    return this.ticketsService.getAdminTickets({ status, category, priority });
  }

  @Patch('admin/:id/status')
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(AccountType.SUPER_ADMIN, AccountType.STAFF)
  async updateStatus(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.ticketsService.updateTicketStatus(id, dto, req.user?.name);
  }
}
