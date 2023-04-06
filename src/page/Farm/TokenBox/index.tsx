/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import useReadContractNumber from '@hooks/useReadContractNumber';
import { ONE_DAY_IN_SECS } from '@utils/time';
import { BigNumber, ethers } from 'ethers';
import React, { useCallback, useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import {
  useAccount,
  useContractRead,
  useContractWrite,
  usePrepareContractWrite,
  useProvider,
  useWaitForTransaction,
} from 'wagmi';
import { API } from '../../../Api';
import { ClaimBtn, StakeBtn, WithdrawBtn } from '../../../components/Btns';
import OnChainNumberDisplay from '../../../components/OnChainNumberDisplay';
import Shimmer from '../../../components/Shimmer';
import { useGlobalStatsContext } from '../../../contexts/globalStatsContext';
import { bigNumberToDecimal, numberToPrecision } from '@utils/number';
import { capitalize } from '@utils/string';
import { getContracts, PoolBlockEmission, type IToken, PoolDailyEmission } from '../tokenConfigs';
// import { useContractContext } from '../../../contexts/contractContext';
import style from './index.module.less';
import StackingModal from './StakeModal';
import { useLocation } from 'react-router-dom';

export const TokenBox = ({ token }: { token: IToken }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [modalMode, setModalMode] = useState<'stake' | 'withdraw'>('stake');

  const { isConnected, address } = useAccount();

  const {
    data: stakedBalanceData,
    isError,
    isLoading: loadingStakedBalance,
  } = useContractRead({
    address: token.stakingContract.address,
    abi: token.stakingContract.abi,
    functionName: 'balanceOf',
    args: [address],
    watch: true,
    enabled: isConnected,
  });

  const hasStacked = stakedBalanceData?.toString() !== '0';

  const { ethPrice, AGIPrice } = useGlobalStatsContext();

  const { config: prepareClaimConfig, error: prepareClaimError } = usePrepareContractWrite({
    address: token.stakingContract.address,
    abi: token.stakingContract.abi,
    functionName: 'getReward',
  });

  const { write: claimReward, data: claimData, error: claimError } = useContractWrite(prepareClaimConfig);

  const { isLoading: isLoadingClaim } = useWaitForTransaction({
    hash: claimData?.hash,
    onSuccess(data) {
      toast.success('Claim Success!');
      setIsModalOpen(false);
    },
  });

  const { config: prepareExitConfig, error: prepareExitError } = usePrepareContractWrite({
    address: token.stakingContract.address,
    abi: token.stakingContract.abi,
    functionName: 'exit',
    enabled: !loadingStakedBalance && hasStacked,
  });

  const { write: exit, data: exitData, error: exitError } = useContractWrite(prepareExitConfig);

  const { isLoading: isLoadingExit, error } = useWaitForTransaction({
    hash: exitData?.hash,
    onSuccess(data) {
      toast.success('Withdraw all Success!');
    },
    onError(error) {
      console.log(error);
      toast.error('Withdraw all Failed!');
    },
  });

  const isHomepage = useLocation().pathname === '/';

  const commonProps = {
    ...token.stakingContract,
    enabled: !isHomepage,
  };

  const { data: rewardPerTokenStored } = useReadContractNumber({
    ...commonProps,
    functionName: 'rewardRate',
  });

  const { data: TVL } = useReadContractNumber({
    ...commonProps,
    functionName: 'totalSupply',
  });

  const { data: balanceOf } = useReadContractNumber({
    ...commonProps,
    functionName: 'balanceOf',
    args: [address],
  });

  const APY = ((1 + (PoolDailyEmission * AGIPrice) / (TVL * ethPrice)) ** (365 * 1) - 1) * 100;

  // console.log(({ APY }, PoolBlockEmission * AGIPrice) / TVL, PoolBlockEmission, AGIPrice, TVL);

  // console.log(`Daily rewoard: ${PoolDailyEmission * AGIPrice}`, { TVL: TVL * ethPrice, APY });

  const onExit = useCallback(() => {
    if (hasStacked) {
      exit?.();
    }
  }, [exit, hasStacked]);

  const onClaimClick = () => {
    claimReward?.();
  };

  const onWithdrawClick = () => {
    setModalMode('withdraw');
    setIsModalOpen(true);
  };

  return (
    <div className={style.token_box}>
      {/* token info */}
      <div className={style.token_info}>
        <span className={style.icon}>
          <img src={token.icon} alt="" />
        </span>
        <span className={style.name}>{token.name}</span>
      </div>

      {/* main */}
      <div className={style.main_sec}>
        <div className={style.apr}>
          <div className={style.text}>APY</div>
          <div className={style.number}>{numberToPrecision(APY, 2)}%</div>
        </div>
        <div className={style.tvl}>
          <div className={style.text}>TVL</div>
          <div className={style.number}>${numberToPrecision(TVL * ethPrice, 0)}</div>
        </div>
      </div>

      {/* claim */}
      <div className={style.claim_sec}>
        <div className={style.left}>
          <div className={style.text}> esAGI Earned</div>
          <div className={style.number}>
            <OnChainNumberDisplay contract={token.stakingContract} valueName={'earned'} args={[address]} watch /> $esAGI
          </div>
        </div>
        <ClaimBtn onClick={onClaimClick} isLoading={isLoadingClaim} />
      </div>

      <div className={style.line}></div>

      {/* stake */}
      <div className={style.stake_sec}>
        <div className={style.left}>
          <div className={style.text}> ETH Staked</div>
          <div className={style.number}>{numberToPrecision(balanceOf, 6)}</div>
        </div>

        <StakeBtn
          onClick={() => {
            if (isConnected) {
              setModalMode('stake');
              setIsModalOpen(true);
            }
          }}
        />
      </div>

      <div className={style.withdraw_btns}>
        <WithdrawBtn onClick={onWithdrawClick}>Withdraw</WithdrawBtn>
        <WithdrawBtn onClick={onExit} isLoading={isLoadingExit}>
          {`${isLoadingExit ? 'Withdrawing' : 'Withdraw'}`} All
        </WithdrawBtn>
      </div>

      <StackingModal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        contractAddress={getContracts().ETHPool.address}
        contractABI={getContracts().ETHPool.abi}
        title={capitalize(modalMode)}
        modalMode={modalMode}
      />
    </div>
  );
};
