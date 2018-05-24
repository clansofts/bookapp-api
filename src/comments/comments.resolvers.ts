import { UseGuards } from '@nestjs/common';
import { Mutation, ResolveProperty, Resolver } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';
import * as DataLoader from 'dataloader';
import { UserService } from 'users/user.service';

import { CommentsService } from './comments.service';

@Resolver('Comment')
export class CommentResolver {
  usersLoader: any;

  constructor(
    private readonly userService: UserService,
    private readonly commentService: CommentsService,
  ) {
    // need to understand how it should work
    this.usersLoader = new DataLoader((userIds: string[]) =>
      userService.findManyByIds(userIds),
    );
  }

  @ResolveProperty('author')
  getAuthor(comment, args, context, info) {
    const { authorId } = comment;
    return this.userService.findById(authorId);
  }

  @Mutation('addComment')
  @UseGuards(AuthGuard('jwt'))
  async addComment(obj, args, context, info) {
    const authorId = info.rootValue.user._id;
    const { bookId, text } = args;
    return await this.commentService.saveForBook(bookId, authorId, text);
  }
}
