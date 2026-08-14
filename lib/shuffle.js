// shuffle.js — Logic thuần (pure functions), KHÔNG đụng UI/DB trực tiếp
// Bước 2 (Pattern & Reusability): tách riêng để test được độc lập, tái dùng ở mọi nơi cần random hoá

// Fisher-Yates — thuật toán chuẩn, không tự chế thuật toán ngẫu nhiên riêng (Bước 3: Native/chuẩn)
const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Sinh 1 bộ đề riêng cho 1 học sinh: trộn thứ tự câu hỏi + trộn thứ tự đáp án từng câu
// Trả về đúng dữ liệu cần lưu vào attempts (question_order, shuffle_map)
const generateShuffledAttempt = (questions) => {
  const questionOrder = shuffleArray(questions.map(q => q.id));
  const shuffleMap = {};
  questions.forEach(q => {
    const nChoices = JSON.parse(q.choices_json).length;
    shuffleMap[q.id] = shuffleArray([...Array(nChoices).keys()]); // vd [2,0,1,3]
  });
  return { questionOrder, shuffleMap };
};

// Dựng lại đề thi hiển thị cho học sinh dựa trên attempt đã lưu (không lộ đáp án đúng)
const buildExamView = (questions, attempt) => {
  const order = JSON.parse(attempt.question_order_json);
  const map = JSON.parse(attempt.shuffle_map_json);
  const byId = Object.fromEntries(questions.map(q => [q.id, q]));
  return order.map(qid => {
    const q = byId[qid];
    const originalChoices = JSON.parse(q.choices_json);
    const shuffledIdx = map[qid];
    return {
      question_id: qid,
      content: q.content,
      choices: shuffledIdx.map(i => originalChoices[i]), // đáp án đã trộn thứ tự
    };
  });
};

// Chấm điểm: so sánh vị trí học sinh chọn (trong hệ shuffled) với correct_index gốc
const gradeAttempt = (questions, attempt) => {
  const map = JSON.parse(attempt.shuffle_map_json);
  const answers = JSON.parse(attempt.answers_json);
  const byId = Object.fromEntries(questions.map(q => [q.id, q]));
  let correct = 0;
  const total = Object.keys(map).length;
  Object.entries(answers).forEach(([qid, chosenShuffledIdx]) => {
    const q = byId[qid];
    const originalIdxChosen = map[qid][chosenShuffledIdx]; // đổi ngược lại index gốc
    if (originalIdxChosen === q.correct_index) correct++;
  });
  return total ? Math.round((correct / total) * 1000) / 100 : 0; // điểm theo thang điểm 10 (chuẩn VN), làm tròn 2 số
};

module.exports = { shuffleArray, generateShuffledAttempt, buildExamView, gradeAttempt };
