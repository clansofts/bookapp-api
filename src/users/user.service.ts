import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ApiQuery } from 'common/models/api-query.model';
import { ApiResponse } from 'common/models/api-response.model';
import { ConfigService } from 'config/config.service';
import * as crypto from 'crypto';
import * as _ from 'lodash';
import { Model } from 'mongoose';
import * as util from 'util';

import { USER_VALIDATION_ERRORS } from '../constants';
import { UserDto } from './dto/user.dto';
import { User } from './interfaces/user.interface';

const randomBytesAsync = util.promisify(crypto.randomBytes);

@Injectable()
export class UserService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<User>,
    private readonly configService: ConfigService,
  ) {}

  async findAll(query?: ApiQuery): Promise<ApiResponse<User>> {
    const where = query.filter || {};
    const count = await this.userModel.count(where);
    const rows = await this.userModel
      .find(where)
      .skip(query.skip)
      .limit(query.first || Number(this.configService.get('DEFAULT_LIMIT')))
      .sort(query.order)
      .exec();

    return {
      count,
      rows,
    };
  }

  async findById(id: string): Promise<User> {
    return await this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<User> {
    return await this.userModel.findOne({ email }).exec();
  }

  async findManyByIds(ids: string[]): Promise<User[]> {
    return this.userModel.find({ id: { $in: ids } }).exec();
  }

  async create(user: UserDto): Promise<User> {
    const newUser = new this.userModel(user);
    newUser.displayName = `${newUser.firstName} ${newUser.lastName}`;
    return await newUser.save();
  }

  async update(id: string, updatedUser: UserDto): Promise<User> {
    const user = await this.userModel.findById(id, '-salt -password').exec();
    _.extend(user, updatedUser);
    user.displayName = `${user.firstName} ${user.lastName}`;
    return await user.save();
  }

  // TODO implement later
  async changeAvatar() {}

  async changePassword(
    id: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<User> {
    const oldPass = String(oldPassword);
    const newPass = String(newPassword);

    const user = await this.userModel.findById(id).exec();

    if (user.authenticate(oldPass)) {
      user.password = newPass;
      return await user.save();
    } else {
      throw new ForbiddenException();
    }
  }

  async requestResetPassword(email: string): Promise<string> {
    let token;
    const user = await this.userModel.findOne({ email }).exec();

    if (!user) {
      throw new NotFoundException(USER_VALIDATION_ERRORS.EMAIL_NOT_FOUND_ERR);
    }

    const buffer = await randomBytesAsync(20);
    token = buffer.toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires =
      Date.now() +
      Number(this.configService.get('REQUEST_TOKEN_EXPIRATION_TIME'));
    await user.save();
    return Promise.resolve(token);
  }

  async resetPassword(token: string, password: string): Promise<User> {
    const user = await this.userModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: {
        $gt: Date.now(),
      },
    });

    if (!user) {
      throw new NotFoundException(USER_VALIDATION_ERRORS.TOKEN_NOT_FOUND_ERR);
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    return await user.save();
  }

  async remove(id: string): Promise<User> {
    const user = await this.userModel.findById(id);
    await user.remove();
    return Promise.resolve(user);
  }
}
