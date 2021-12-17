/**
 * @Name: websocket.js
 * @Author: Clloz
 * @Date: 2021/12/16 3:42 PM
 * @Description:
 * @LastEditors: Clloz
 * @LastEditTime: 2021/12/16 3:42 PM
 * @FilePath: WebSocket/websocket.js
 * 博观而约取，厚积而薄发。
 */
const net = require('net'); // net 模块提供一个异步的网络 API 用来创建基于流的 TCP 或者 IPC(Inter Process Communication) 的服务端或者客户端 https://blog.csdn.net/manhua253/article/details/4219655
const crypto = require('crypto'); // crypto 模块提供了一些加密和解密的方法
const { Buffer } = require('buffer');

// 解析请求头
function parseHeader(data) {
    const header = {};
    const lines = data.split('\r\n').filter(line => line);
    lines.shift(); // 去除第一行请求行
    lines.forEach(line => {
        const [key, value] = line.split(': ');
        header[key.toLowerCase()] = value;
    });
    return header;
}

// utf-8 转字符串
function utf8ToString(buffer) {
    console.log(buffer);
    let result = '';
    for (let i = 0; i < buffer.length; i += 1) {
        if (buffer[i] >> 7 === 0) {
            result += String.fromCodePoint(buffer[i]);
        }
        if (buffer[i] >> 5 === 0b110) {
            const codePoint = ((buffer[i] & 0x1f) << 6) | (buffer[i + 1] & 0x3f);
            result += String.fromCodePoint(codePoint);
            i += 1;
        }
        if (buffer[i] >> 4 === 0b1110) {
            const codePoint =
                ((buffer[i] & 0xf) << 12) | ((buffer[i + 1] & 0x3f) << 6) | (buffer[i + 2] & 0x3f);
            result += String.fromCodePoint(codePoint);
            i += 2;
        }
        if (buffer[i] >> 3 === 0b11110) {
            const codePoint =
                ((buffer[i] & 0xf) << 18) |
                ((buffer[i + 1] & 0x3f) << 12) |
                ((buffer[i + 2] & 0x3f) << 6) |
                (buffer[i + 3] & 0x3f);
            try {
                result += String.fromCodePoint(codePoint);
            } catch (e) {
                console.log(buffer[i], buffer[i + 1], buffer[i + 2], buffer[i + 3]);
            }
            i += 3;
        }
    }
    return result;
}

// 字符串转 utf-8
function stringToUtf8(str) {
    const { length } = str;
    const result = [];
    for (let i = 0; i < length; i += 1) {
        const codePoint = str.codePointAt(i);
        if (codePoint <= 0x7f) {
            result.push(codePoint & 0x7f);
        } else if (codePoint >= 0x80 && codePoint <= 0x7ff) {
            result.push(((codePoint >> 6) & 0x1f) | 0xc0);
            result.push((codePoint & 0x3f) | 0x80);
        } else if (codePoint >= 0x800 && codePoint <= 0xffff) {
            result.push(((codePoint >> 12) & 0xf) | 0xe0);
            result.push(((codePoint >> 6) & 0x3f) | 0x80);
            result.push((codePoint & 0x3f) | 0x80);
        } else if (codePoint >= 0x10000 && codePoint <= 0x10ffff) {
            result.push(((codePoint >> 18) & 0x7) | 0xf0);
            result.push(((codePoint >> 12) & 0x3f) | 0x80);
            result.push(((codePoint >> 6) & 0x3f) | 0x80);
            result.push((codePoint & 0x3f) | 0x80);
            i += 1;
        }
    }
    return Uint8Array.from(result);
}

// 反掩码，请求的 payload 都是经过掩码处理的，要看实际内容先要反掩码
function unMask(data, mask) {
    const { length } = data;
    const result = new Uint8Array(length);
    for (let i = 0; i < length; i += 1) {
        result[i] = data[i] ^ mask[i % 4];
    }
    return result;
}

/**
 * @description: 解封数据帧，主要是根据 payloadLength 和 maskingKey 将 payload 解码为对应的 utf-8 编码或者二进制数据 TODO: 此处只是一个简单的实现，没有处理连续帧的情况
 * @param data (数据帧)
 * @return: utf-8 对应的字符串或者二进制数据
 */
function decodeWebSocketFrame(data) {
    const frame = {
        isFinal: (data[0] >> 7) & 1, // 是否为最后一帧
        rsv1: (data[0] >> 6) & 1, // 必须为0 除非扩展了非 0 值的含义的扩展
        rsv2: (data[0] >> 5) & 1, // 同上
        rsv3: (data[0] >> 4) & 1, // 同上
        opcode: data[0] & 0xf, // 帧类型 %x0 表示一个连续帧（接续上一个帧） %x1 为文本帧 %x2 为二进制帧 %x3-7 保留 %x8 表示连接关闭 %x9 为ping帧 %xA 为pong帧 %xB-F 保留
        mask: (data[1] >> 7) & 1, // 是否有掩码
        payloadLength: data[1] & 0x7f, // 帧长度 0-125 则为精确长度，如果为126 则后面两个字节为长度 如果为127 则后面8个字节为长度
        extendedPayloadLength:
            // eslint-disable-next-line no-nested-ternary
            data[1] === 0x7f ? data.readUIntBE(2, 2) : data[1] === 0xff ? data.readUIntBE(2, 8) : 0, // 扩展长度
        maskingKey: [data[2], data[3], data[4], data[5]], // 掩码
        maskedPayload: data.slice(6), // 掩码后的数据
    };

    // payloadLength 为 126 则后面 2 字节的 16 位无符号整数为 payloadLength
    if (frame.payloadLength === 0x7e) {
        frame.payloadLength = data.readUIntBE(2, 2);
        frame.maskingKey = [data[4], data[5], data[6], data[7]];
        frame.maskedPayload = data.slice(8);
    }

    // payloadLength 为 127 则后面 8 字节的 64 位无符号整数(最高位必须为 0)为 payloadLength
    if (frame.payloadLength === 0x7f) {
        frame.payloadLength = data.readUIntBE(2, 8);
        frame.maskingKey = [data[10], data[11], data[12], data[13]];
        frame.maskedPayload = data.slice(14);
    }

    frame.unMaskedPayload = unMask(frame.maskedPayload, frame.maskingKey); // 解码
    console.log(frame);
    return frame;
}

/**
 * @description: 封装要发送的数据帧，作为一个小 demo 就不处理 extendPayloadLength 以及 mask 了，这里我是用两个字符串发送了两个连续帧，
 * 不出意外这两个连续帧会在 DevTools 的 Network 中被拼为一个字符串。
 * @param:
 * @return:
 */
function decodeWebsocketFrame(data1, data2) {
    const dataBuf1 = stringToUtf8(data1);
    const dataBuf2 = stringToUtf8(data2);
    const frame1 = Buffer.concat(
        [Buffer.from([1, dataBuf1.length]), dataBuf1],
        2 + dataBuf1.length,
    );
    const frame2 = Buffer.concat(
        [Buffer.from([128, dataBuf2.length]), dataBuf2],
        2 + dataBuf2.length,
    );
    return [frame1, frame2]; //
}

const server = net.createServer(socket => {
    // console.log(socket);
    socket.once('data', buffer => {
        console.log(Object.prototype.toString.call(buffer)); // 确定 buffer 的类型 Uint8Array
        const str = buffer.toString();
        const headers = parseHeader(str); // 解析请求头
        console.log(headers); // 观察一下请求头

        if (headers.upgrade !== 'websocket') {
            console.log('不是 websocket 请求');
            socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        } else if (headers['sec-websocket-version'] !== '13') {
            console.log('不支持的 websocket 版本');
            socket.end('HTTP/1.1 426 Upgrade Required\r\nSec-WebSocket-Version: 13\r\n\r\n');
        } else {
            const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
            const key = headers['sec-websocket-key'];
            const acceptKey = crypto
                .createHash('sha1')
                .update(key + GUID)
                .digest('base64');
            const response = `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${acceptKey}\r\n\r\n`;
            socket.write(response);
            console.log(response);

            socket.on('data', msgBuffer => {
                console.log(Object.prototype.toString.call(msgBuffer)); // 确定 buffer 的类型 Uint8Array
                const frame = decodeWebSocketFrame(msgBuffer);
                console.log(frame.opcode);
                // 只处理了 字符，二进制和关闭三种情况
                switch (frame.opcode) {
                    case 1:
                        console.log(utf8ToString(frame.unMaskedPayload));
                        break;
                    case 2:
                        console.log(frame.unMaskedPayload);
                        break;
                    case 8:
                        console.log(8);
                        socket.end();
                        break;
                    default:
                        break;
                }
            });

            const [frame1, frame2] = decodeWebsocketFrame('cll𝌆oz', 'finish');
            setInterval(() => {
                socket.write(frame1);
                socket.write(frame2);
            }, 1000);
        }
    });
});

server.listen(3000);
