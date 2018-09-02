import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ApiQuery } from 'common/models/api-query.model';
import { ApiResponse } from 'common/models/api-response.model';
import { ConfigService } from 'config/config.service';
import { FileService } from 'files/file.service';
import * as _ from 'lodash';
import { LogDto } from 'logs/dto/log.dto';
import { LogService } from 'logs/log.service';
import { Model } from 'mongoose';

import { USER_ACTIONS } from '../constants';
import { BookDto } from './dto/book.dto';
import { Book } from './interfaces/book.interface';

@Injectable()
export class BookService {
  constructor(
    @InjectModel('Book') private readonly bookModel: Model<Book>,
    private readonly configService: ConfigService,
    private readonly fileService: FileService,
    private readonly logService: LogService,
  ) {}

  async findAll(query?: ApiQuery): Promise<ApiResponse<Book>> {
    const where = query.filter || {};
    const count = await this.bookModel.countDocuments(where);
    const rows = await this.bookModel
      .find(where)
      .skip(query.skip || 0)
      .limit(query.first || Number(this.configService.get('DEFAULT_LIMIT')))
      .sort(query.order)
      .exec();

    return {
      count,
      rows,
    };
  }

  findBySlug(slug: string): Promise<Book> {
    return this.bookModel
      .findOneAndUpdate({ slug }, { $inc: { views: 1 } })
      .exec();
  }

  findById(id: string): Promise<Book> {
    return this.bookModel.findById(id).exec();
  }

  findByIds(ids: string[]): Promise<Book[]> {
    return this.bookModel.find({ _id: { $in: ids } }).exec();
  }

  async findBestBooks(query?: ApiQuery): Promise<ApiResponse<Book>> {
    const where = { rating: 5 };
    const count = await this.bookModel.countDocuments(where);
    const rows = await this.bookModel
      .find(where)
      .skip(query.skip || 0)
      .limit(query.first || Number(this.configService.get('DEFAULT_LIMIT')))
      .exec();

    return {
      count,
      rows,
    };
  }

  async create(book: BookDto, userId: string): Promise<Book> {
    const newBook = new this.bookModel(book);
    await newBook.save();
    await this.logService.create(
      new LogDto(userId, USER_ACTIONS.BOOK_CREATED, newBook._id),
    );
    return newBook;
  }

  async update(
    id: string,
    updatedBook: BookDto,
    userId: string,
  ): Promise<Book> {
    const book = await this.bookModel.findById(id).exec();
    const filePromises = [];
    // remove old files from bucket first if new ones are adding
    if (
      book.coverUrl &&
      updatedBook.coverUrl &&
      book.coverUrl !== updatedBook.coverUrl
    ) {
      const splitted = book.coverUrl.split('/'); // take last part of uri as a key
      filePromises.push(
        this.fileService.deleteFromBucket(splitted[splitted.length - 1]),
      );
    }

    if (
      book.epubUrl &&
      updatedBook.epubUrl &&
      book.epubUrl !== updatedBook.epubUrl
    ) {
      const splitted = book.epubUrl.split('/'); // take last part of uri as a key
      filePromises.push(
        this.fileService.deleteFromBucket(splitted[splitted.length - 1]),
      );
    }

    if (filePromises.length) {
      try {
        await Promise.all(filePromises);
      } catch (err) {
        throw new BadRequestException(err);
      }
    }

    _.extend(book, updatedBook);
    await book.save();
    await this.logService.create(
      new LogDto(userId, USER_ACTIONS.BOOK_UPDATED, book._id),
    );
    return book;
  }

  async rateBook(id: string, newRate: number, userId: string): Promise<Book> {
    const book = await this.bookModel.findById(id).exec();
    const total_rates = book.total_rates + 1;
    const total_rating = book.total_rating + newRate;
    const rating = Math.ceil(total_rating / total_rates);
    book.total_rates = total_rates;
    book.total_rating = total_rating;
    book.rating = rating;
    await book.save();
    await this.logService.create(
      new LogDto(userId, USER_ACTIONS.BOOK_RATED, book._id),
    );
    return book;
  }
}
