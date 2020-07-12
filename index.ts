import * as fs from 'fs-extra'

/* PUBLIC */

export async function totalRx(opts) {
  if (opts) {
    opts.iface = opts.iface || 'lo'
    opts.units = opts.units || 'bytes'
  } else {
    opts = {
      iface: 'lo',
      units: 'bytes',
    }
  }

  const total = parseInt((await _parseProcNetDev())[opts.iface].bytes.receive)
  const converted = _bytesTo(total, opts.units)

  return converted
}

export async function totalTx(opts) {
  if (opts) {
    opts.iface = opts.iface || 'lo'
    opts.units = opts.units || 'bytes'
  } else {
    opts = {
      iface: 'lo',
      units: 'bytes',
    }
  }

  const total = parseInt(_parseProcNetDev()[opts.iface].bytes.transmit)
  const converted = _bytesTo(total, opts.units)

  return converted
}

export async function usageRx(opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {
      iface: 'lo',
      units: 'bytes',
      sampleMs: 1000,
    }
  } else {
    opts.iface = opts.iface || 'lo'
    opts.units = opts.units || 'bytes'
    opts.sampleMs = opts.sampleMs || 1000
  }

  let time

  //take first measurement
  const total0 = _parseProcNetDev()[opts.iface].bytes.receive
  time = process.hrtime()

  setTimeout(function () {
    //take second measurement
    const total1 = _parseProcNetDev()[opts.iface].bytes.receive
    const diff = process.hrtime(time)
    const diffSeconds = diff[0] + diff[1] * 1e-9

    //do the calculations
    const total = parseInt(total1) - parseInt(total0)
    const totalPerSecond = total / (diffSeconds * diffSeconds)
    const converted = _bytesTo(totalPerSecond, opts.units)

    return cb(converted)
  }, opts.sampleMs)
}

export async function usageTx(opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {
      iface: 'lo',
      units: 'bytes',
      sampleMs: 1000,
    }
  } else {
    opts.iface = opts.iface || 'lo'
    opts.units = opts.units || 'bytes'
    opts.sampleMs = opts.sampleMs || 1000
  }

  let time

  //take first measurement
  const total0 = await _parseProcNetDev()[opts.iface].bytes.transmit
  time = process.hrtime()

  setTimeout(async function () {
    //take second measurement
    const total1 = await _parseProcNetDev()[opts.iface].bytes.transmit
    const diff = process.hrtime(time)
    const diffSeconds = diff[0] + diff[1] * 1e-9

    //do the calculations
    const total = parseInt(total1) - parseInt(total0)
    const totalPerSecond = total / (diffSeconds * diffSeconds)
    const converted = _bytesTo(totalPerSecond, opts.units)

    return cb(converted)
  }, opts.sampleMs)
}

//NOTE: raw `/proc/net/dev` as object
//NOTE: can use this function to determine what interfaces are available by listing
//      the return objects keys
export async function raw() {
  return await _parseProcNetDev()
}

/* PRIVATE */

//NOTE: borrowed/modifed from `https://github.com/soldair/node-procfs-stats/blob/feca2a940805b31f9e7d5c0bd07c4e3f8d3d5303/index.js#L343`
//TODO: more cleaning, rename the one char constiables to something more expressive
async function _parseProcNetDev() {
  const buf = await fs.readFile(process.env.NETSTATDEVICE || '/proc/net/dev')
  const lines = buf.toString().trim().split('\n')
  const sections = lines.shift().split('|')
  const columns = lines.shift().trim().split('|')

  let s
  let l
  let c
  let p = 0
  const map = {}
  const keys = []
  for (let i = 0; i < sections.length; ++i) {
    s = sections[i].trim()
    l = sections[i].length
    c = columns[i].trim().split(/\s+/g)
    while (c.length) {
      map[keys.length] = s
      keys.push(c.shift())
    }
    p += s.length + 1
  }

  const retObj = {}

  lines.forEach(function (l: any) {
    l = l.trim().split(/\s+/g)
    const o = {}
    let iface
    for (let i = 0; i < l.length; ++i) {
      const s = map[i]

      //case for the Interface
      if (s.indexOf('-') === s.length - 1) {
        iface = l[i].substr(0, l[i].length - 1)

        //case for everything else
      } else {
        if (!o[keys[i]]) {
          o[keys[i].toLowerCase()] = {}
        }
        o[keys[i].toLowerCase()][s.toLowerCase()] = l[i]
      }
    }
    retObj[iface] = o
  })

  return retObj
}

function _bytesTo(bytes, units) {
  const KiB = 1024
  const MiB = 1024 * KiB
  const GiB = 1024 * MiB

  switch (units) {
    case 'bytes':
      break
    case 'KiB':
      bytes /= KiB
      break
    case 'MiB':
      bytes /= MiB
      break
    case 'GiB':
      bytes /= GiB
      break
    default:
      const errMsg =
        '[net-stats] Error: Unknown units "' + units + '", use one of: ' + '"bytes" (default), "KiB", "MiB" or "GiB"'
      console.log(errMsg)
  }

  //NOTE: the constiable named `bytes` may not actually contain a number
  //representing the number of bytes. its done this way to only have to use one
  //constiable.
  return bytes
}
