//
//	lib.test.js
//	x
//
//	Created by Andrey Shpigunov on 14.09.2024.
//


import { lib } from './lib';


test('lib.random between 0 and 100', () => {
  for (let i; i < 100; i++) {
    expect(lib.random(0, 100)).toBeGreaterThan(-1);
    expect(lib.random(0, 100)).toBeLessThan(101);
  }
});


test('lib.random between 1010 and 1020', () => {
  for (let i; i < 100; i++) {
    expect(lib.random(1010, 1020)).toBeGreaterThan(1009);
    expect(lib.random(1010, 1020)).toBeLessThan(1021);
  }
});


test('lib.numberDecline from 0 to 20', () => {
  let a = [1, 21]
  let b = [2, 3, 4, 22, 23, 24]
  let c = [0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25, 26, 27, 28, 29, 30]
  for (let i of a) {
    expect(lib.numberDecline(i, 'a', 'b', 'c')).toBe('a');
  }
  for (let i of b) {
    expect(lib.numberDecline(i, 'a', 'b', 'c')).toBe('b');
  }
  for (let i of c) {
    expect(lib.numberDecline(i, 'a', 'b', 'c')).toBe('c');
  }
});
