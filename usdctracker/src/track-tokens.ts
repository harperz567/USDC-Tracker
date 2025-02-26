import { Transfer as TransferEvent } from '../generated/TrackTokens/TrackTokens'
import { Transfer, Account, Statistic, DailyVolume, AccountBalance } from '../generated/schema'
import { BigInt } from "@graphprotocol/graph-ts"

export function handleTransfer(event: TransferEvent): void {
  // 1. Create a new Transfer entity, set up relavent fields
  let transfer = new Transfer(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
  transfer.from = event.params.from.toHex()
  transfer.to = event.params.to.toHex()
  transfer.value = event.params.value
  transfer.blockNumber = event.block.number
  transfer.timestamp = event.block.timestamp

  // 2. Update sender info
  let fromAccount = Account.load(transfer.from)
  if (fromAccount == null) {
    fromAccount = new Account(transfer.from)
    fromAccount.balance = BigInt.fromI32(0)
  }
  fromAccount.balance = fromAccount.balance.minus(transfer.value)
  fromAccount.save()

  // 3. Update receiver info
  let toAccount = Account.load(transfer.to)
  if (toAccount == null) {
    toAccount = new Account(transfer.to)
    toAccount.balance = BigInt.fromI32(0)
  }
  toAccount.balance = toAccount.balance.plus(transfer.value)
  toAccount.save()

  // 4. Save Transfer entity
  transfer.save()

  // Standardize timestamp
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400 // make it into days
  let dayStartTimestamp = dayID * 86400
  let dayString = dayID.toString()

  // Renew daily statistic
  let statistic = Statistic.load('singleton')
  if (statistic == null) {
    statistic = new Statistic('singleton')
    statistic.totalTransfers = BigInt.fromI32(0)
    statistic.totalVolume = BigInt.fromI32(0)
    statistic.activeAccounts = BigInt.fromI32(0)
  }
  
  statistic.totalTransfers = statistic.totalTransfers.plus(BigInt.fromI32(1))
  statistic.totalVolume = statistic.totalVolume.plus(event.params.value)

  let dailyVolume = DailyVolume.load(dayString)
  if (dailyVolume == null) {
    dailyVolume = new DailyVolume(dayString)
    dailyVolume.statistic = 'singleton'
    dailyVolume.date = dayString
    dailyVolume.volume = BigInt.fromI32(0)
    dailyVolume.transferCount = BigInt.fromI32(0)
  }
  
  dailyVolume.volume = dailyVolume.volume.plus(event.params.value)
  dailyVolume.transferCount = dailyVolume.transferCount.plus(BigInt.fromI32(1))
  
  // Account balance history
  let accountBalanceID = transfer.from + '-' + event.block.number.toString()
  let fromAccountBalance = new AccountBalance(accountBalanceID)
  fromAccountBalance.account = transfer.from
  fromAccountBalance.balance = fromAccount.balance
  fromAccountBalance.timestamp = event.block.timestamp
  fromAccountBalance.blockNumber = event.block.number

  // Account balance history for receiver
  let toAccountBalanceID = transfer.to + '-' + event.block.number.toString();
  let toAccountBalance = new AccountBalance(toAccountBalanceID);
  toAccountBalance.account = transfer.to;
  toAccountBalance.balance = toAccount.balance;
  toAccountBalance.timestamp = event.block.timestamp;
  toAccountBalance.blockNumber = event.block.number;
  
  // Save all entities
  statistic.save()
  dailyVolume.save()
  fromAccountBalance.save()
  toAccountBalance.save()
}