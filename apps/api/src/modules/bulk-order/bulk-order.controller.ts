import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BulkOrderService } from './bulk-order.service';
import { BulkQuotationRequestDto } from '@siam-aqua/shared-types';

@Controller('bulk-order')
export class BulkOrderController {
  constructor(private readonly bulkOrderService: BulkOrderService) {}

  @Post('quote')
  async createQuote(@Req() req: any, @Body() dto: BulkQuotationRequestDto) {
    const buyerId = req.user?.id || undefined;
    return this.bulkOrderService.generateQuotation(buyerId, dto);
  }

  @Get('quote/:quoteNumber')
  async getQuote(@Param('quoteNumber') quoteNumber: string) {
    return this.bulkOrderService.getQuotationByNumber(quoteNumber);
  }
}
