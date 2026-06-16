
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.15.0
 * Query Engine version: 12e25d8d06f6ea5a0252864dd9a03b1bb51f3022
 */
Prisma.prismaVersion = {
  client: "5.15.0",
  engine: "12e25d8d06f6ea5a0252864dd9a03b1bb51f3022"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}

/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  role: 'role',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  avatarUrl: 'avatarUrl',
  storeCredit: 'storeCredit'
};

exports.Prisma.StoreScalarFieldEnum = {
  id: 'id',
  name: 'name',
  ownerId: 'ownerId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  priceAlertDailyThreshold: 'priceAlertDailyThreshold',
  priceAlertWeeklyThreshold: 'priceAlertWeeklyThreshold',
  buylistDefaultRate: 'buylistDefaultRate',
  buylistDefaultRateCredit: 'buylistDefaultRateCredit'
};

exports.Prisma.TournamentScalarFieldEnum = {
  id: 'id',
  name: 'name',
  format: 'format',
  status: 'status',
  roundTimer: 'roundTimer',
  currentRound: 'currentRound',
  totalRounds: 'totalRounds',
  pairingMode: 'pairingMode',
  roundStartedAt: 'roundStartedAt',
  date: 'date',
  storeId: 'storeId',
  firstPlacePoints: 'firstPlacePoints',
  secondPlacePoints: 'secondPlacePoints',
  thirdPlacePoints: 'thirdPlacePoints',
  fourthPlacePoints: 'fourthPlacePoints',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PlayerRegistrationScalarFieldEnum = {
  id: 'id',
  tournamentId: 'tournamentId',
  userId: 'userId',
  deckUrl: 'deckUrl',
  deckStatus: 'deckStatus',
  deckCost: 'deckCost',
  isPaid: 'isPaid',
  score: 'score',
  drop: 'drop',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MatchScalarFieldEnum = {
  id: 'id',
  tournamentId: 'tournamentId',
  roundNumber: 'roundNumber',
  tableNumber: 'tableNumber',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MatchPlayerScalarFieldEnum = {
  id: 'id',
  matchId: 'matchId',
  registrationId: 'registrationId',
  points: 'points',
  customMissions: 'customMissions',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TournamentPrizeScalarFieldEnum = {
  id: 'id',
  tournamentId: 'tournamentId',
  name: 'name',
  startPlace: 'startPlace',
  endPlace: 'endPlace',
  storeCreditAmount: 'storeCreditAmount'
};

exports.Prisma.TournamentMissionScalarFieldEnum = {
  id: 'id',
  tournamentId: 'tournamentId',
  description: 'description',
  points: 'points'
};

exports.Prisma.UserPrizeScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  tournamentId: 'tournamentId',
  name: 'name',
  awardedAt: 'awardedAt',
  place: 'place'
};

exports.Prisma.ScryfallCardScalarFieldEnum = {
  id: 'id',
  oracleId: 'oracleId',
  name: 'name',
  setCode: 'setCode',
  setName: 'setName',
  collectorNumber: 'collectorNumber',
  rarity: 'rarity',
  typeLine: 'typeLine',
  oracleText: 'oracleText',
  manaCost: 'manaCost',
  colors: 'colors',
  colorIdentity: 'colorIdentity',
  imageUris: 'imageUris',
  finishes: 'finishes',
  lang: 'lang',
  priceEur: 'priceEur',
  priceEurFoil: 'priceEurFoil',
  priceUsd: 'priceUsd',
  priceUsdFoil: 'priceUsdFoil',
  pricesUpdatedAt: 'pricesUpdatedAt',
  scryfallUri: 'scryfallUri',
  legalities: 'legalities'
};

exports.Prisma.StockItemScalarFieldEnum = {
  id: 'id',
  scryfallCardId: 'scryfallCardId',
  condition: 'condition',
  finish: 'finish',
  quantity: 'quantity',
  salePrice: 'salePrice',
  pricingRuleId: 'pricingRuleId',
  priceMode: 'priceMode',
  language: 'language',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConditionModifierScalarFieldEnum = {
  id: 'id',
  condition: 'condition',
  multiplier: 'multiplier'
};

exports.Prisma.FlashSaleScalarFieldEnum = {
  id: 'id',
  name: 'name',
  discount: 'discount',
  startsAt: 'startsAt',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt',
  isActive: 'isActive'
};

exports.Prisma.FlashSaleItemScalarFieldEnum = {
  id: 'id',
  flashSaleId: 'flashSaleId',
  stockItemId: 'stockItemId'
};

exports.Prisma.RoundingBandScalarFieldEnum = {
  id: 'id',
  minPrice: 'minPrice',
  maxPrice: 'maxPrice',
  roundTo: 'roundTo',
  priority: 'priority'
};

exports.Prisma.PricingRuleScalarFieldEnum = {
  id: 'id',
  name: 'name',
  type: 'type',
  valueA: 'valueA',
  valueB: 'valueB',
  minPrice: 'minPrice',
  maxPrice: 'maxPrice',
  createdAt: 'createdAt'
};

exports.Prisma.PriceHistoryScalarFieldEnum = {
  id: 'id',
  scryfallCardId: 'scryfallCardId',
  priceEur: 'priceEur',
  priceEurFoil: 'priceEurFoil',
  recordedAt: 'recordedAt'
};

exports.Prisma.SyncLogScalarFieldEnum = {
  id: 'id',
  type: 'type',
  status: 'status',
  cardsUpserted: 'cardsUpserted',
  error: 'error',
  startedAt: 'startedAt',
  finishedAt: 'finishedAt'
};

exports.Prisma.CartScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CartItemScalarFieldEnum = {
  id: 'id',
  cartId: 'cartId',
  stockItemId: 'stockItemId',
  quantity: 'quantity',
  priceAtAdd: 'priceAtAdd',
  createdAt: 'createdAt'
};

exports.Prisma.OrderScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  status: 'status',
  totalPrice: 'totalPrice',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrderItemScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  stockItemId: 'stockItemId',
  quantity: 'quantity',
  priceAtPurchase: 'priceAtPurchase'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  title: 'title',
  message: 'message',
  read: 'read',
  type: 'type',
  linkUrl: 'linkUrl',
  createdAt: 'createdAt'
};

exports.Prisma.StockNotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  oracleId: 'oracleId',
  scryfallCardId: 'scryfallCardId',
  isFulfilled: 'isFulfilled',
  createdAt: 'createdAt'
};

exports.Prisma.PriceAlertScalarFieldEnum = {
  id: 'id',
  scryfallCardId: 'scryfallCardId',
  storeId: 'storeId',
  oldPrice: 'oldPrice',
  newPrice: 'newPrice',
  percentageChange: 'percentageChange',
  timeframe: 'timeframe',
  createdAt: 'createdAt'
};

exports.Prisma.ArticleScalarFieldEnum = {
  id: 'id',
  title: 'title',
  content: 'content',
  imageUrl: 'imageUrl',
  tags: 'tags',
  endDate: 'endDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BuylistRequestScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  status: 'status',
  totalPrice: 'totalPrice',
  defaultRate: 'defaultRate',
  tradeType: 'tradeType',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BuylistItemScalarFieldEnum = {
  id: 'id',
  buylistRequestId: 'buylistRequestId',
  scryfallCardId: 'scryfallCardId',
  quantity: 'quantity',
  condition: 'condition',
  finish: 'finish',
  language: 'language',
  marketPrice: 'marketPrice',
  buyPrice: 'buyPrice'
};

exports.Prisma.BuylistPriceBandScalarFieldEnum = {
  id: 'id',
  minPrice: 'minPrice',
  maxPrice: 'maxPrice',
  rateCash: 'rateCash',
  rateCredit: 'rateCredit',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  User: 'User',
  Store: 'Store',
  Tournament: 'Tournament',
  PlayerRegistration: 'PlayerRegistration',
  Match: 'Match',
  MatchPlayer: 'MatchPlayer',
  TournamentPrize: 'TournamentPrize',
  TournamentMission: 'TournamentMission',
  UserPrize: 'UserPrize',
  ScryfallCard: 'ScryfallCard',
  StockItem: 'StockItem',
  ConditionModifier: 'ConditionModifier',
  FlashSale: 'FlashSale',
  FlashSaleItem: 'FlashSaleItem',
  RoundingBand: 'RoundingBand',
  PricingRule: 'PricingRule',
  PriceHistory: 'PriceHistory',
  SyncLog: 'SyncLog',
  Cart: 'Cart',
  CartItem: 'CartItem',
  Order: 'Order',
  OrderItem: 'OrderItem',
  Notification: 'Notification',
  StockNotification: 'StockNotification',
  PriceAlert: 'PriceAlert',
  Article: 'Article',
  BuylistRequest: 'BuylistRequest',
  BuylistItem: 'BuylistItem',
  BuylistPriceBand: 'BuylistPriceBand'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
