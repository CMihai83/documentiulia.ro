export declare class CreateCategoryDto {
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    color?: string;
    sortOrder?: number;
}
export declare class UpdateCategoryDto {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    sortOrder?: number;
    isActive?: boolean;
}
export declare class CreateTopicDto {
    title: string;
    content: string;
    categoryId: string;
    tags?: string[];
}
export declare class UpdateTopicDto {
    title?: string;
    content?: string;
    tags?: string[];
    isPinned?: boolean;
    isLocked?: boolean;
    isSolved?: boolean;
}
export declare class CreateReplyDto {
    content: string;
    parentId?: string;
}
export declare class UpdateReplyDto {
    content?: string;
}
export declare class TopicFilterDto {
    categoryId?: string;
    search?: string;
    tag?: string;
    isSolved?: boolean;
    page?: number;
    limit?: number;
}
//# sourceMappingURL=forum.dto.d.ts.map