import { MainModulePage } from './MainModulePage';
import { Shifts } from './PosWorkspace';

export default function PosShiftReviewPage() {
  return <MainModulePage allStores><Shifts main /></MainModulePage>;
}
