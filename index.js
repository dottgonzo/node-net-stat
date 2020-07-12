Object.defineProperty(exports, "__esModule", { value: true });
exports.raw = exports.usageTx = exports.usageRx = exports.totalTx = exports.totalRx = void 0;
const fs = require("fs-extra");
async function totalRx(opts) {
    if (opts) {
        opts.iface = opts.iface || 'lo';
        opts.units = opts.units || 'bytes';
    }
    else {
        opts = {
            iface: 'lo',
            units: 'bytes',
        };
    }
    const total = parseInt((await _parseProcNetDev())[opts.iface].bytes.receive);
    const converted = _bytesTo(total, opts.units);
    return converted;
}
exports.totalRx = totalRx;
async function totalTx(opts) {
    if (opts) {
        opts.iface = opts.iface || 'lo';
        opts.units = opts.units || 'bytes';
    }
    else {
        opts = {
            iface: 'lo',
            units: 'bytes',
        };
    }
    const total = parseInt(_parseProcNetDev()[opts.iface].bytes.transmit);
    const converted = _bytesTo(total, opts.units);
    return converted;
}
exports.totalTx = totalTx;
async function usageRx(opts, cb) {
    if (typeof opts === 'function') {
        cb = opts;
        opts = {
            iface: 'lo',
            units: 'bytes',
            sampleMs: 1000,
        };
    }
    else {
        opts.iface = opts.iface || 'lo';
        opts.units = opts.units || 'bytes';
        opts.sampleMs = opts.sampleMs || 1000;
    }
    let time;
    const total0 = _parseProcNetDev()[opts.iface].bytes.receive;
    time = process.hrtime();
    setTimeout(function () {
        const total1 = _parseProcNetDev()[opts.iface].bytes.receive;
        const diff = process.hrtime(time);
        const diffSeconds = diff[0] + diff[1] * 1e-9;
        const total = parseInt(total1) - parseInt(total0);
        const totalPerSecond = total / (diffSeconds * diffSeconds);
        const converted = _bytesTo(totalPerSecond, opts.units);
        return cb(converted);
    }, opts.sampleMs);
}
exports.usageRx = usageRx;
async function usageTx(opts, cb) {
    if (typeof opts === 'function') {
        cb = opts;
        opts = {
            iface: 'lo',
            units: 'bytes',
            sampleMs: 1000,
        };
    }
    else {
        opts.iface = opts.iface || 'lo';
        opts.units = opts.units || 'bytes';
        opts.sampleMs = opts.sampleMs || 1000;
    }
    let time;
    const total0 = await _parseProcNetDev()[opts.iface].bytes.transmit;
    time = process.hrtime();
    setTimeout(async function () {
        const total1 = await _parseProcNetDev()[opts.iface].bytes.transmit;
        const diff = process.hrtime(time);
        const diffSeconds = diff[0] + diff[1] * 1e-9;
        const total = parseInt(total1) - parseInt(total0);
        const totalPerSecond = total / (diffSeconds * diffSeconds);
        const converted = _bytesTo(totalPerSecond, opts.units);
        return cb(converted);
    }, opts.sampleMs);
}
exports.usageTx = usageTx;
async function raw() {
    return await _parseProcNetDev();
}
exports.raw = raw;
async function _parseProcNetDev() {
    const buf = await fs.readFile(process.env.NETSTATDEVICE || '/proc/net/dev');
    const lines = buf.toString().trim().split('\n');
    const sections = lines.shift().split('|');
    const columns = lines.shift().trim().split('|');
    let s;
    let l;
    let c;
    let p = 0;
    const map = {};
    const keys = [];
    for (let i = 0; i < sections.length; ++i) {
        s = sections[i].trim();
        l = sections[i].length;
        c = columns[i].trim().split(/\s+/g);
        while (c.length) {
            map[keys.length] = s;
            keys.push(c.shift());
        }
        p += s.length + 1;
    }
    const retObj = {};
    lines.forEach(function (l) {
        l = l.trim().split(/\s+/g);
        const o = {};
        let iface;
        for (let i = 0; i < l.length; ++i) {
            const s = map[i];
            if (s.indexOf('-') === s.length - 1) {
                iface = l[i].substr(0, l[i].length - 1);
            }
            else {
                if (!o[keys[i]]) {
                    o[keys[i].toLowerCase()] = {};
                }
                o[keys[i].toLowerCase()][s.toLowerCase()] = l[i];
            }
        }
        retObj[iface] = o;
    });
    return retObj;
}
function _bytesTo(bytes, units) {
    const KiB = 1024;
    const MiB = 1024 * KiB;
    const GiB = 1024 * MiB;
    switch (units) {
        case 'bytes':
            break;
        case 'KiB':
            bytes /= KiB;
            break;
        case 'MiB':
            bytes /= MiB;
            break;
        case 'GiB':
            bytes /= GiB;
            break;
        default:
            const errMsg = '[net-stats] Error: Unknown units "' + units + '", use one of: ' + '"bytes" (default), "KiB", "MiB" or "GiB"';
            console.log(errMsg);
    }
    return bytes;
}
//# sourceMappingURL=index.js.map