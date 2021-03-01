class BinaryObject {
	app: any;
// converted from stackoverflow
	private flt64: Float64Array = new Float64Array(1);
	private uint16: Uint16Array = new Uint16Array(this.flt64.buffer);
	private readonly MAX_SAFE: number = 9007199254740991; // 2**53-1
	private readonly MAX_INT32: number = 2147483648; // 2**31

	constructor( app: any ) {
		this.app = app;
	}

	uint16ToBinary() {
		var bin64 = '';

	    for (var word = 0; word < 4; word++) {
	      bin64 = this.uint16[word].toString(2).padStart(16, "0") + bin64
	    }

	    return bin64;
	}

	float64ToInt64Binary(number : number) {
	    // NaN would pass through Math.abs(number) > MAX_SAFE
		if (!(Math.abs(number) <= this.MAX_SAFE))
			return null;

		var sign = number < 0 ? "1" : "0";
		// shortcut for sufficiently small range
		if (Math.abs(number) <= this.MAX_INT32) {
			return (number >>> 0).toString(2).padStart(64, sign);
		}


		// little endian byte ordering
		this.flt64[0] = number;
		// subtract bias from exponent bits
		var exponent = ((this.uint16[3] & 0x7FF0) >> 4) - 1023;

		// encode implicit leading bit of mantissa
		this.uint16[3] |= 0x10;
		// clear exponent and sign bit
		this.uint16[3] &= 0x1F;

		// check sign bit
		if (sign === "1") {
		// apply two's complement
			this.uint16[0] ^= 0xFFFF;
			this.uint16[1] ^= 0xFFFF;
			this.uint16[2] ^= 0xFFFF;
			this.uint16[3] ^= 0xFFFF;
				// propagate carry bit
			for (var word = 0; word < 3 && this.uint16[word] === 0xFFFF; word++) {
					// apply integer overflow
				this.uint16[word] = 0
			}

			// complete increment
			this.uint16[word]++
		}
		var bin64 = this.uint16ToBinary().substr(11, Math.max(exponent, 0));
		// sign-extend binary string
		return bin64.padStart(64, sign);
	}
}

// only keep integer part of mantissa
/*
console.log('8')
console.log(float64ToInt64Binary(8))
console.log('-8')
console.log(float64ToInt64Binary(-8))
console.log('2**33-1')
console.log(float64ToInt64Binary(2**33-1))
console.log('-(2**33-1)')
console.log(float64ToInt64Binary(-(2**33-1)))
console.log('2**53-1')
console.log(float64ToInt64Binary(2**53-1))
console.log('-(2**53-1)')
console.log(float64ToInt64Binary(-(2**53-1)))
console.log('2**52')
console.log(float64ToInt64Binary(2**52))
console.log('-(2**52)')
console.log(float64ToInt64Binary(-(2**52)))
*/

export = BinaryObject;
