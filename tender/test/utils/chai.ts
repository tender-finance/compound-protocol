import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber } from "ethers";
import chai, { expect } from "chai";
import chaiBN from "chai-bn";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
chai.use(chaiBN(BigNumber));
export { expect };
