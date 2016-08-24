var common = require('../common');
var multipartParser = require(common.lib + '/multipart_parser'),
    MultipartParser = multipartParser.MultipartParser,
    events = require('events'),
    Buffer = require('buffer').Buffer,
    parser;

function test(test) {
  parser = new MultipartParser();
  test();
}

test(function constructor() {
  assert.equal(parser.boundary, null);
  assert.equal(parser.state, 0);
  assert.equal(parser.flags, 0);
  assert.equal(parser.boundaryChars, null);
  assert.equal(parser.index, null);
  assert.equal(parser.lookbehind, null);
  assert.equal(parser.constructor.name, 'MultipartParser');
});

test(function initWithBoundary() {
  var boundary = 'abc';
  parser.initWithBoundary(boundary);
  assert.deepEqual(Array.prototype.slice.call(parser.boundary), [13, 10, 45, 45, 97, 98, 99]);
  assert.equal(parser.state, multipartParser.START);

  assert.deepEqual(parser.boundaryChars, {10: true, 13: true, 45: true, 97: true, 98: true, 99: true});
});

test(function parserError() {
  var boundary = 'abc',
      buffer = new Buffer(5);

  parser.initWithBoundary(boundary);
  buffer.write('--ad', 0);
  assert.equal(parser.write(buffer), 5);
});

test(function end() {
  (function testError() {
    assert.equal(parser.end().message, 'MultipartParser.end(): stream ended unexpectedly: ' + parser.explain());
  })();

  (function testRegular() {
    parser.state = multipartParser.END;
    assert.strictEqual(parser.end(), undefined);
  })();
});

test(function testRFC1521() {
  var boundary = 'simple boundary',

    falseBoundary =
      '--simple boundary\r\nContent-ID: 123456\r\nObject-ID: 1\r\nContent-Type: image/jpeg\r\nLocation: http://example.com/1.jpg\r\n\r\n'
    + '--simple panda\r\n'
    + '--simple boundary--',

    rfc1521 =
      '--simple boundary\r\nContent-ID: 123456\r\nObject-ID: 1\r\nContent-Type: image/jpeg\r\nLocation: http://example.com/1.jpg\r\n\r\n'
    + '--simple boundary\r\nContent-ID: 123456\r\nObject-ID: 2\r\nContent-Type: image/jpeg\r\nLocation: http://example.com/2.jpg\r\n\r\n'
    + '--simple boundary--',

    rfc1521WithData =
      '--simple boundary\r\nContent-ID: 123456\r\nObject-ID: 1\r\nContent-Type: image/jpeg\r\nLocation: http://example.com/1.jpg\r\n\r\n'
    + 'this is data\r\n'
    + '--simple boundary--',

    validNoData =
      '\r\n--simple boundary\r\nContent-ID: 123456\r\nObject-ID: 1\r\nContent-Type: image/jpeg\r\nLocation: http://example.com/1.jpg\r\n\r\n'
    + '\r\n--simple boundary\r\nContent-ID: 123456\r\nObject-ID: 2\r\nContent-Type: image/jpeg\r\nLocation: http://example.com/2.jpg\r\n\r\n'
    + '\r\n--simple boundary--',

    validWithData =
      '\r\n--simple boundary\r\nContent-ID: 123456\r\nObject-ID: 1\r\nContent-Type: image/jpeg\r\nLocation: http://example.com/1.jpg\r\n\r\n'
    + 'Data Item 1'
    + '\r\n--simple boundary\r\nContent-ID: 123456\r\nObject-ID: 2\r\nContent-Type: image/jpeg\r\nLocation: http://example.com/2.jpg\r\n\r\n'
    + 'Data Item 2'
    + '\r\n--simple boundary--';


  // console.log('FALSE BOUNDARY TEST');
  falseParser = new MultipartParser();
  falseParser.initWithBoundary(boundary);
  falseBuffer = new Buffer(falseBoundary.length);
  falseBuffer.write(falseBoundary, 0);
  let partData = '';
  falseParser.onPartData = function (b, start, end) {
    partData += b.slice(start, end).toString();
  };
  assert.equal(falseBuffer.length, falseParser.write(falseBuffer), 'Parse error for false boundary check');
  assert.equal('state = END', falseParser.explain(), 'State not as expected for false boundary check');
  assert.equal('--simple panda', partData, 'Data not as expected for false boundary check');

  // console.log('RFC TEST');
  rfcParser = new MultipartParser();
  rfcParser.initWithBoundary(boundary);
  rfcBuffer = new Buffer(rfc1521.length);
  rfcBuffer.write(rfc1521, 0);
  rfcParser.onPartData = function (b, start, end) {
    assert.ok(false, 'RFC 1521 test should have no data');
  };
  assert.equal(rfcBuffer.length, rfcParser.write(rfcBuffer), 'RFC 1521 Parse error');
  assert.equal('state = END', rfcParser.explain(), 'RFC 1521 ending state not as expected');

  // console.log('RFC DATA TEST');
  rfcDataParser = new MultipartParser();
  rfcDataParser.initWithBoundary(boundary);
  rfcDataBuffer = new Buffer(rfc1521WithData.length);
  rfcDataBuffer.write(rfc1521WithData, 0);
  partData = '';
  rfcDataParser.onPartData = function (b, start, end) {
    partData += b.slice(start, end).toString();
  };
  assert.equal(rfcDataBuffer.length, rfcDataParser.write(rfcDataBuffer), 'Parse error for RFC 1521 boundaries with data');
  assert.equal('state = END', rfcDataParser.explain(), 'State not as expected for RFC 1521 boundaries with Data');
  assert.equal('this is data', partData, 'Data not as expected for RFC 1521 boundaries with data');

  // console.log('STANDARD NO DATA TEST');
  standardParser = new MultipartParser();
  standardParser.initWithBoundary(boundary);
  standardBuffer = new Buffer(validNoData.length);
  standardBuffer.write(validNoData, 0);
  standardParser.onPartData = function (b, start, end) {
    assert.ok(false, 'Standard boundary test should have no data');
  };
  assert.equal(standardBuffer.length, standardParser.write(standardBuffer), 'Parse error for standard boundaries');
  assert.equal('state = END', standardParser.explain(), 'State not as expected for standard boundaries');

  // console.log('STANDARD WITH DATA TEST');
  standardDataParser = new MultipartParser();
  standardDataParser.initWithBoundary(boundary);
  standardDataBuffer = new Buffer(validWithData.length);
  standardDataBuffer.write(validWithData, 0);
  partData = '';
  standardDataParser.onPartData = function (b, start, end) {
    partData += b.slice(start, end).toString();
  };
  assert.equal(standardDataBuffer.length, standardDataParser.write(standardDataBuffer), 'Parse error for standard boundaries with data');
  assert.equal('state = END', standardDataParser.explain(), 'State not as expected for standard boundaries with data');
  assert.equal('Data Item 1Data Item 2', partData, 'Data not as expected for standard boundaries');
});