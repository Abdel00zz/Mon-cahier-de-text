const { twMerge } = require('tailwind-merge');
console.log(twMerge('lg:w-[252px]', 'w-[84px]'));
console.log(twMerge('w-[84px]', 'lg:w-[252px]'));
