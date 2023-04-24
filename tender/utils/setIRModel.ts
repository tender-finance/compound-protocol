import '@nomiclabs/hardhat-ethers';
import { ethers } from 'hardhat';

const irModel = '0xA738B4910b0A93583A7E3E56d73467FE7c538158';

const markets = [
  '0xC6121d58E01B3F5C88EB8a661770DB0046523539',
  '0x242f91207184FCc220beA3c9E5f22b6d80F3faC5',
  '0x4180f39294c94F046362c2DBC89f2DF7786842c3',
]

const main = async () => {
  for (const market of markets) {
    const marketContract = await ethers.getContractAt('CErc20Delegate', market);
    await marketContract._setInterestRateModel(irModel);
  }
}

main();

  "tEth": "0x0706905b2b21574DEFcF00B5fc48068995FCdCdf",
  "tWBTC": "0x0A2f8B6223EB7DE26c810932CCA488A4936cF391",
  "tLINK": "0x87D06b55e122a0d0217d9a4f85E983AC3d7a1C35",
  "tUNI": "0x8b44D3D286C64C8aAA5d445cFAbF7a6F4e2B3A71",
