import ReturnForm from './ReturnForm';

export default function RepairList({ borrows, refresh }) {
  if (borrows.length === 0) {
    return <p>ไม่มีรายการยืม</p>;
  }

  return (
    <div>
      <h3>รายการที่ยังยืมอยู่</h3>
      {borrows.map(borrow => (
        <ReturnForm
          key={borrow._id}
          borrow={borrow}
          onSuccess={refresh}
        />
      ))}
    </div>
  );
}
