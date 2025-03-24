import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ArticlesService } from "../articles.service";
import { Article } from "../../entities/article.entity";
import { User } from "../../entities/user.entity";
import { RedisService } from "../../cache/redis.service";
import { NotFoundException } from "@nestjs/common";
import { CreateArticleDto } from "../dto/create-article.dto";
import { ArticleFilterDto } from "../dto/article-filter.dto";

describe("ArticlesService", () => {
  let service: ArticlesService;
  let articleRepository: Repository<Article>;

  const mockArticleRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    })),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    deletePattern: jest.fn(),
  };

  const mockUser: User = {
    id: "1",
    email: "test@example.com",
    password: "password",
    articles: [],
    firstName: "Test",
    lastName: "User",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockArticle: Article = {
    id: "1",
    title: "Test Article",
    description: "Test Description",
    publishDate: new Date(),
    author: mockUser,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        {
          provide: getRepositoryToken(Article),
          useValue: mockArticleRepository,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<ArticlesService>(ArticlesService);
    articleRepository = module.get<Repository<Article>>(
      getRepositoryToken(Article)
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return articles from cache if available", async () => {
      const filterDto: ArticleFilterDto = { page: 1, limit: 10 };
      const mockArticleString = JSON.stringify(mockArticle);
      const cachedData = JSON.stringify([[JSON.parse(mockArticleString)], 1]);
      
      mockRedisService.get.mockResolvedValue(cachedData);

      const result = await service.findAll(filterDto);

      expect(result).toEqual([[JSON.parse(mockArticleString)], 1]);
      expect(mockRedisService.get).toHaveBeenCalled();
      expect(articleRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it("should fetch articles from database if not in cache", async () => {
      const filterDto: ArticleFilterDto = { page: 1, limit: 10 };
      
      mockRedisService.get.mockResolvedValue(null);
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockArticle], 1]),
      };
      mockArticleRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAll(filterDto);

      expect(result).toEqual([[mockArticle], 1]);
      expect(mockRedisService.get).toHaveBeenCalled();
      expect(articleRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockRedisService.set).toHaveBeenCalled();
    });
  });

  describe("create", () => {
    it("should create a new article", async () => {
      const createArticleDto: CreateArticleDto = {
        title: "New Article",
        description: "New Description",
      };

      mockArticleRepository.create.mockReturnValue(mockArticle);
      mockArticleRepository.save.mockResolvedValue(mockArticle);

      const result = await service.create(createArticleDto, mockUser);

      expect(result).toEqual(mockArticle);
      expect(mockArticleRepository.create).toHaveBeenCalledWith({
        ...createArticleDto,
        author: mockUser,
        publishDate: expect.any(Date),
      });
      expect(mockArticleRepository.save).toHaveBeenCalled();
      expect(mockRedisService.deletePattern).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return article from cache if available", async () => {
      const mockArticleString = JSON.stringify(mockArticle);
      mockRedisService.get.mockResolvedValue(mockArticleString);

      const result = await service.findOne("1");

      expect(result).toEqual(JSON.parse(mockArticleString));
      expect(mockRedisService.get).toHaveBeenCalled();
      expect(articleRepository.findOne).not.toHaveBeenCalled();
    });

    it("should fetch article from database if not in cache", async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockArticleRepository.findOne.mockResolvedValue(mockArticle);

      const result = await service.findOne("1");

      expect(result).toEqual(mockArticle);
      expect(mockRedisService.get).toHaveBeenCalled();
      expect(articleRepository.findOne).toHaveBeenCalled();
      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it("should throw NotFoundException if article not found", async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockArticleRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne("1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("should update article if user is the author", async () => {
      const updateArticleDto: Partial<CreateArticleDto> = {
        title: "Updated Title",
      };

      mockArticleRepository.findOne.mockResolvedValue(mockArticle);
      mockArticleRepository.save.mockResolvedValue({
        ...mockArticle,
        ...updateArticleDto,
      });

      const result = await service.update("1", updateArticleDto, mockUser);

      expect(result.title).toBe("Updated Title");
      expect(mockArticleRepository.save).toHaveBeenCalled();
      expect(mockRedisService.deletePattern).toHaveBeenCalled();
    });

    it("should throw NotFoundException if user is not the author", async () => {
      const differentUser: User = { ...mockUser, id: "2" };
      mockArticleRepository.findOne.mockResolvedValue(mockArticle);

      await expect(
        service.update("1", { title: "Updated Title" }, differentUser)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should remove article if user is the author", async () => {
      mockArticleRepository.findOne.mockResolvedValue(mockArticle);

      await service.remove("1", mockUser);

      expect(mockArticleRepository.remove).toHaveBeenCalledWith(mockArticle);
      expect(mockRedisService.deletePattern).toHaveBeenCalled();
    });

    it("should throw NotFoundException if user is not the author", async () => {
      const differentUser: User = { ...mockUser, id: "2" };
      mockArticleRepository.findOne.mockResolvedValue(mockArticle);

      await expect(service.remove("1", differentUser)).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
