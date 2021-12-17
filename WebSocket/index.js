/*
 * @Author: Clloz
 * @Date: 2021-12-16 19:19:19
 * @LastEditTime: 2021-12-17 10:39:24
 * @LastEditors: Clloz
 * @Description:
 * @FilePath: /network-note/WebSocket/index.js
 * 博观而约取，厚积而薄发，日拱一卒，日进一寸。
 */
/**
 * @Name: index.js
 * @Author: Clloz
 * @Date: 2021/12/16 7:19 PM
 * @Description:
 * @LastEditors: Clloz
 * @LastEditTime: 2021/12/16 7:19 PM
 * @FilePath:
 * @博观而约取，厚积而薄发。
 */
const ws = new WebSocket('ws://localhost:3000');
ws.onopen = () => {
    console.log(ws.extensions); // 获取扩展
};
ws.onclose = () => {
    console.log('close');
};
/* eslint-disable no-unused-vars */
ws.binaryType = 'arraybuffer';
const sendString = () => {
    ws.send(
        '在 JavaScript 设计的初期，没有预计到这个语言会得到如此广泛的应用和发展，也没有想过会处理如此复杂的业务，所以也没有添加对二进制数据处理的支持。但是现在很多场景需要我们处理二进制数据，比如 canvas 的图像处理，WebGL 与显卡的通信，一些音视频文件的处理（比如语音对讲的功能实现），ajax 的二进制输出传输，文件处理（创建，上传，下载）等。需求的改变必然推动 JavaScript 对二进制数据处理的支持，目前我们在 JavaScript 中处理二进制主要依赖几个对象 ArrayBuffer，TypedArray， DataView， Blob 和 File等。本文详细探索一下前端二进制处理相关的内容。\n' +
            '\n' +
            '为什么用二进制\n' +
            '首先说两个计算机中常见的概念 stream 流和 buffer 缓冲。\n' +
            '\n' +
            'stream 流\n' +
            '我们经常听到的字节流，视频流，文件流，这个流要怎么理解。首先这个 stream 肯定就是借用我们现实世界的流的概念来形象化地表示计算机中的抽象概念，比如世界的流入水流气流，所以抽象到计算机中其表示的就是一段连续的数据。比如水龙头，当我们打开开关（开始产生数据），流就产生了，这些数据没有绝对位置，也没有确定的开头和结尾，只是不断产生，并随着时间向前流动，你可以随时截取流中的一段数据进行处理。\n' +
            '\n' +
            'buffer 缓冲\n' +
            '比如我们做音视频处理一般会涉及到 buffer 的设置，其实就是我们开辟了一块空间叫做 buffer，当数据流装满这个空间的时候我们在一次处理整个 buffer 中的数据。因为很多时候我们的 stream 的速度不是确定的，为了保证数据的生产和消费的速度相匹配，保证一个稳定的输出。\n' +
            '\n' +
            '说完了两个概念我们来说一说为什么要使用二进制数据，可以确定的是这肯定是为了性能。因为二进制就是我们的数据在内存中的形式，直接操作内存的效率肯定是最高的。平时我们开发 web 应用基本不需要考虑性能问题，因为 Web 应用基本都是 IO 密集型的，以如今的个人电脑和移动设备的性能，绝大多数的 web 应用的数据量和数据处理都不是瓶颈，即使我们用了比较糟糕的数据结构和算法基本也不存在问题 :laughing:。但是在涉及到像是 canvas 和 webgl 这样每一帧都需要渲染大量像素的场景下，性能就非常重要，比如 webgl 我们就需要连续的内存交给底层的 C 的 API 去处理。再比如像是前端录制音频和传输，本身就是连续采样的大量的模拟转数字的数据，自然用二进制来处理是最合适的。你可以想象一下上面的这些场景如果我们把数据都存放到数组中我们需要遍历数组额外做很多操作，这样性能肯定大受影响，在这样的 CPU 密集型工作显然要优先以性能为第一优先级。\n' +
            '\n' +
            '关于 JS 中为什么使用二进制和引擎的一些细节可以参考 Are the advantages of Typed Arrays in JavaScript is that they work the same or similar in C?\n' +
            '\n' +
            'JS 中的二进制相关对象\n' +
            'JavaScript 中的二进制相关对象主要是 ArrayBuffer，TypedArray（只是一个统称，没有一个叫 TypedArray 的对象），DataView，Blob 和 File。其中前三个可以算是真正的二进制操作，后面两个是二进制大对象的操作，不能进行内部的修改。下面我们详细说一说这些对象。\n' +
            '\n' +
            'ArrayBuffer\n' +
            'ArrayBuffer 是 JavaScript 中基础的二进制对象，是一个固定长度连续内存区域的引用，我们可以用 ArrayBuffer 构造函数来创建一个新的 ArrayBuffer。',
    );
};
const sendSMPString = () => {
    ws.send('𝌆');
};
const sendBinary = () => {
    const int8Array = new Int8Array(2);
    int8Array[0] = 100;
    int8Array[1] = 255;
    ws.send(int8Array);
    console.log(ws.bufferedAmount); // 获取缓冲区的大小
};
const getBufferedAmount = () => {
    console.log(ws.bufferedAmount); // 获取缓冲区的大小
};
const getExtensions = () => {
    console.log(ws.extensions); // 获取扩展
};
const closeWS = () => {
    console.log('close');
    ws.close(); // 关闭连接
};
const getUrl = () => {
    console.log(ws.url);
};
