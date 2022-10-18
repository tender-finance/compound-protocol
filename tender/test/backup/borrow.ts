async function borrow(
  value: string,
  signer: Signer,
  cToken: cToken,
  token: Token
): Promise<Txn> {
  if (token.symbol === "ETH") {
      console.log("borrow() with cEth");

      const formattedValue = ethers.utils.parseEther(value);
      console.log("input value:", value, "formattedValue:", formattedValue);

      let contract = new ethers.Contract(cToken.address, sampleCEtherAbi, signer);
      return await contract.borrow(formattedValue);
    }
  else {

    const formattedValue: BigNumber = ethers.utils.parseUnits(
      value,
      token.decimals
    );

    let contract = new ethers.Contract(cToken.address, SampleCTokenAbi, signer);
    return await contract.borrow(formattedValue);
  }
}
async function getCurrentlyBorrowing(
  signer: Signer,
  cToken: cToken,
  token: Token
): Promise<number> {
  let abi = cToken.symbol === "tETH" ? SampleCEtherAbi : SampleCTokenAbi;

  let contract: Contract = new ethers.Contract(
    cToken.address,
    abi,
    signer
  );
  let address: string = await signer.getAddress();
  let balance: BigNumber = await contract.borrowBalanceStored(address);
  
  return formatBigNumber(balance, token.decimals);
}

async function collateralFactorForToken(
  signer: Signer,
  comptrollerContract: Contract,
  tokenPair: TokenPair
): Promise<number> {
  let { 1: rawCollateralFactor } = await comptrollerContract.markets(
    tokenPair.cToken.address
  );

  // Collateral factors are always 1e18
  let collateralFactor: number = parseFloat(
    formatUnits(rawCollateralFactor, 18)
  );

  return collateralFactor;
}

async function borrowLimitForTokenInUsd(
  signer: Signer,
  comptrollerContract: Contract,
  tp: TokenPair
): Promise<number> {
  let suppliedAmount: number = await getCurrentlySupplying(
    signer,
    tp.cToken,
    tp.token
  );

  let collateralFactor: number = await collateralFactorForToken(
    signer,
    comptrollerContract,
    tp
  );

  let amount = suppliedAmount * tp.token.priceInUsd * collateralFactor;

  return amount;
}
