import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from 'users/user.module';

import { CommentResolver } from './comments.resolvers';
import { CommentsService } from './comments.service';
import { CommentSchema } from './schemas/comment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Comment', schema: CommentSchema }]),
    UsersModule,
  ],
  providers: [CommentsService, CommentResolver],
  exports: [CommentsService],
})
export class CommentsModule {}
