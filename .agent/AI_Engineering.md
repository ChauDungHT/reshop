# AI Engineering

## Chương 1

**1. Tên chương:** Chapter 1. Introduction to Building AI Applications with Foundation Models[cite: 1]

**2. Nội dung chi tiết:**
*   Sự bùng nổ của AI sau năm 2020 được định nghĩa bởi "quy mô" (scale), dẫn đến sự ra đời của các mô hình nền tảng (Foundation Models) mạnh mẽ[cite: 1].
*   Sự xuất hiện của "Mô hình như một dịch vụ" (Model as a Service) giúp giảm rào cản gia nhập, cho phép xây dựng ứng dụng AI mà không cần đầu tư huấn luyện mô hình từ đầu[cite: 1].
*   Kỹ nghệ AI (AI Engineering) được định nghĩa là quá trình xây dựng các ứng dụng dựa trên các mô hình có sẵn, khác biệt với kỹ nghệ học máy (ML Engineering) truyền thống[cite: 1].
*   Các mô hình ngôn ngữ (Language Models) phát triển nhờ cơ chế tự giám sát (self-supervision), giúp vượt qua điểm nghẽn về gán nhãn dữ liệu thủ công.
*   Có hai loại mô hình ngôn ngữ chính: mô hình ngôn ngữ bị che (masked) và mô hình tự hồi quy (autoregressive), trong đó loại sau phổ biến hơn cho việc tạo nội dung.
*   Mô hình nền tảng là sự mở rộng từ văn bản sang đa phương thức (multimodal), có khả năng xử lý hình ảnh, âm thanh và video.
*   Kỹ nghệ AI phát triển nhanh chóng nhờ khả năng đa nhiệm của mô hình, dòng vốn đầu tư lớn và sự phổ biến của các giao diện lập trình ứng dụng (API).
*   Các kỹ thuật thích ứng mô hình chính bao gồm: Kỹ nghệ gợi ý (Prompt Engineering), RAG (Truy xuất tăng cường tạo) và Tinh chỉnh (Finetuning).
*   Các ứng dụng phổ biến bao gồm: hỗ trợ lập trình, sản xuất hình ảnh/video, viết lách, giáo dục, chatbot hội thoại và tự động hóa quy trình.
*   Việc lập kế hoạch ứng dụng AI cần cân nhắc giữa rủi ro và cơ hội, vai trò của con người trong vòng lặp (human-in-the-loop) và tính phòng thủ của sản phẩm.
*   Ngăn xếp công nghệ AI (AI Stack) gồm ba lớp: Phát triển ứng dụng, Phát triển mô hình và Cơ sở hạ tầng.
*   Đánh giá (Evaluation) trở thành thách thức lớn nhất trong kỹ nghệ AI do tính chất mở của đầu ra từ các mô hình nền tảng.

**3. Các bài báo trong bài:**
*   **Claude Shannon (1951):** "Prediction and Entropy of Printed English".
*   **Devlin et al. (2018):** Bài báo về BERT (Bidirectional Encoder Representations from Transformers).
*   **Krizhevsky et al. (2012):** Bài báo về AlexNet (ImageNet classification).
*   **OpenAI (2021):** Nghiên cứu về mô hình CLIP (Contrastive Language-Image Pre-training).
*   **Wang et al. (2022):** Benchmark Super-NaturalInstructions.
*   **Eloundou et al. (2023) / OpenAI study:** "GPTs are GPTs: An Early Look at the Labor Market Impact Potential of Large Language Models".
*   **Pajak and Bicknell (2022):** Nghiên cứu từ Duolingo về việc sử dụng AI trong thiết kế khóa học.
*   **Park et al. (2023):** Nghiên cứu về "Generative Agents" mô phỏng xã hội.
*   **Noy and Zhang (2023):** Nghiên cứu của MIT về tác động của ChatGPT đối với công việc viết lách chuyên nghiệp.
*   **Ding et al. (2023):** Bài báo "UltraChat" về thách thức trong việc hoàn thiện sản phẩm AI.
*   **Hendrycks et al. (2020):** Benchmark MMLU (Massive Multitask Language Understanding).
*   **Shawn Wang (2023):** Bài viết "The Rise of the AI Engineer".
*   **Katrina Nguyen (2024):** Biểu đồ về hiệu suất MMLU so với chi phí theo thời gian.

## Chương 2

**1. Tên chương:** Chapter 2. Understanding Foundation Models[cite: 2]

**2. Nội dung chi tiết:**
*   Chương này tập trung vào các quyết định thiết kế cốt lõi ảnh hưởng đến khả năng và giới hạn của các mô hình nền tảng, bao gồm dữ liệu huấn luyện, kiến trúc và quá trình hậu huấn luyện[cite: 2].
*   Dữ liệu huấn luyện là yếu tố quyết định; các mô hình thường học từ các nguồn dữ liệu internet khổng lồ như Common Crawl nhưng gặp vấn đề về chất lượng và sự thiếu hụt đại diện cho các ngôn ngữ ít phổ biến (low-resource languages)[cite: 2].
*   Kiến trúc Transformer hiện đang thống trị nhờ cơ chế chú ý (attention mechanism), cho phép xử lý song song dữ liệu đầu vào nhưng vẫn gặp nút thắt tuần tự ở đầu ra và giới hạn độ dài ngữ cảnh[cite: 2].
*   Quy mô mô hình được đo bằng số lượng tham số, số lượng token huấn luyện và số phép tính dấu phẩy động (FLOPs), trong đó định luật tỷ lệ Chinchilla giúp xác định quy mô tối ưu dựa trên ngân sách tính toán[cite: 2].
*   Các kiến trúc thay thế như SSM (State Space Models), RWKV hay các mô hình lai như Jamba đang nổi lên để giải quyết vấn đề bộ nhớ dài hạn và hiệu suất suy luận tuyến tính[cite: 2].
*   Quá trình hậu huấn luyện (Post-training) bao gồm tinh chỉnh có giám sát (SFT) để tối ưu hóa khả năng hội thoại và tinh chỉnh tùy chọn (Preference finetuning) như RLHF hoặc DPO để căn chỉnh mô hình với sở thích con người[cite: 2].
*   Lấy mẫu (Sampling) là một quy trình quan trọng biến đầu ra AI thành xác suất; các biến như temperature, top-k, top-p giúp cân bằng giữa tính sáng tạo và độ ổn định[cite: 2].
*   Kỹ thuật tính toán tại thời điểm kiểm tra (Test Time Compute) như "best-of-N" hoặc sử dụng bộ xác thực (verifiers) giúp cải thiện chất lượng phản hồi bằng cách tạo nhiều phương án và chọn lọc[cite: 2].
*   Đầu ra có cấu trúc (Structured Outputs) là yêu cầu thiết yếu cho các ứng dụng thực tế, có thể đạt được qua kỹ nghệ gợi ý, hậu xử lý, lấy mẫu ràng buộc hoặc tinh chỉnh chuyên biệt[cite: 2].
*   Bản chất xác suất của AI mang lại sự sáng tạo nhưng cũng gây ra các vấn đề nghiêm trọng như tính không nhất quán (inconsistency) và hiện tượng ảo giác (hallucination)[cite: 2].

**3. Các bài báo trong bài:**
*   **Vaswani et al. (2017):** "Attention Is All You Need" (Giới thiệu kiến trúc Transformer).
*   **Lai et al. (2023):** Nghiên cứu về phân bổ ngôn ngữ trong Common Crawl.
*   **OpenAI (2023):** Báo cáo kỹ thuật GPT-4 (Benchmark MMLU đa ngôn ngữ).
*   **Gunasekar et al. (2023):** "Textbooks Are All You Need" (Về tác động của dữ liệu chất lượng cao).
*   **Touvron et al. (2023):** Báo cáo về các mô hình Llama 2.
*   **Dubey et al. (2024):** Báo cáo về các mô hình Llama 3.
*   **DeepMind (2022):** "Training Compute-Optimal Large Language Models" (Định luật Chinchilla).
*   **Gu et al. (2021a/b):** Nghiên cứu về State Space Models (SSMs) và S4.
*   **Gu and Dao (2023):** "Mamba: Linear-Time Sequence Modeling with Selective State Spaces".
*   **Lieber et al. (2024):** "Jamba: A Hybrid Transformer-Mamba Language Model".
*   **Shazeer et al. (2017):** "Outrageously Large Neural Networks" (Về Mixture-of-Experts - MoE).
*   **Rafailov et al. (2023):** "Direct Preference Optimization: Your Language Model is Secretly a Reward Model" (DPO).
*   **Ouyang et al. (2022):** "Training language models to follow instructions with human feedback" (InstructGPT).
*   **Villalobos et al. (2022/2024):** Dự báo về sự cạn kiệt dữ liệu internet để huấn luyện AI.
*   **Shumailov et al. (2023):** "The Curse of Recursion" (Về việc huấn luyện trên dữ liệu do AI tạo ra).
*   **Snell et al. (2024):** "Scaling LLM Test-Time Compute Optimally can be More Effective than Scaling Parameters".
*   **Perez et al. (2022):** Nghiên cứu của Anthropic về hiện tượng "Inverse Scaling".
*   **Goyal et al. (2016), Lee et al. (2018), Nie et al. (2019), Zhou et al. (2020):** Các nghiên cứu về đo lường và phát hiện ảo giác (hallucination).
*   **Zhang et al. (2023):** "How Language Model Hallucinations Snowball".

## CHương 3

**1. Tên chương:** Chapter 3. Evaluation Methodology[cite: 3]

**2. Nội dung chi tiết:**
*   Đánh giá (Evaluation) là rào cản lớn nhất khi đưa ứng dụng AI vào thực tế để giảm thiểu rủi ro thất bại thảm khốc như ảo giác hoặc thông tin sai lệch[cite: 3].
*   Việc đánh giá các mô hình nền tảng khó khăn hơn ML truyền thống do tính chất mở (open-ended), sự phức tạp của các tác vụ bậc cao và việc thiếu dữ liệu tham chiếu (ground truth)[cite: 3].
*   Các thước đo ngôn ngữ truyền thống như Entropy (độ hỗn loạn), Cross Entropy và Perplexity (độ bối rối) vẫn đóng vai trò quan trọng trong việc đo lường độ chính xác dự báo của mô hình[cite: 3].
*   Perplexity được coi là một chỉ số đại diện tốt cho khả năng của mô hình, mặc dù nó có thể tăng lên sau khi thực hiện các kỹ thuật hậu huấn luyện như SFT hoặc RLHF[cite: 3].
*   Đánh giá chính xác (Exact Evaluation) bao gồm kiểm tra tính đúng đắn về chức năng (như khả năng thực thi code) và đo lường độ tương đồng (Lexical/Semantic similarity) với dữ liệu tham chiếu[cite: 3].
*   Các kỹ thuật đo tương đồng văn bản phổ biến bao gồm so khớp chính xác, tương đồng từ vựng (BLEU, ROUGE) và tương đồng ngữ nghĩa thông qua Embedding (Cosine similarity)[cite: 3].
*   Embedding là biểu diễn số học của dữ liệu; thuật toán tốt là khi các văn bản tương đồng có khoảng cách vector gần nhau trong không gian biểu diễn[cite: 3].
*   "AI làm giám khảo" (AI as a Judge) đang trở thành xu hướng nhờ tốc độ nhanh và chi phí thấp, cho phép đánh giá dựa trên các tiêu chí như độ tin cậy, mức độ hữu ích hoặc độc hại[cite: 3].
*   Phương pháp AI giám khảo vẫn tồn tại các hạn chế về tính không nhất quán, sự mơ hồ trong tiêu chí đánh giá, chi phí API tăng thêm và các định kiến (bias) của mô hình[cite: 3].
*   Đánh giá so sánh (Comparative Evaluation) giúp xếp hạng các mô hình dựa trên tín hiệu thắng-thua (pairwise comparison), tương tự như hệ thống Elo trong thể thao hoặc game[cite: 3].
*   Tương lai của đánh giá so sánh nằm ở khả năng nắm bắt sở thích con người mà không cần các bộ dữ liệu tham chiếu cố định vốn dễ bị bão hòa hoặc lỗi thời[cite: 3].

**3. Các bài báo trong bài:**
*   **Claude Shannon (1951):** "Prediction and Entropy of Printed English"[cite: 3].
*   **Chang et al. (2023):** Nghiên cứu về xu hướng các bài báo đánh giá LLM[cite: 3].
*   **Liu et al. (2023):** Nghiên cứu về sự tương quan giữa hiệu suất mô hình ngôn ngữ và ứng dụng hạ nguồn[cite: 3].
*   **Yu et al. (2018):** Benchmark Spider cho Text-to-SQL[cite: 3].
*   **Li et al. (2023):** Benchmark BIRD-SQL cho cơ sở dữ liệu quy mô lớn[cite: 3].
*   **Zhong et al. (2017):** Benchmark WikiSQL[cite: 3].
*   **Chen et al. (2021):** Nghiên cứu của OpenAI về sự khác biệt giữa điểm BLEU và tính đúng đắn chức năng trong code[cite: 3].
*   **Muennighoff et al. (2023):** MTEB (Massive Text Embedding Benchmark)[cite: 3].
*   **Radford et al. (2021):** Kiến trúc CLIP về Embedding đa phương thức[cite: 3].
*   **Xue et al. (2022):** ULIP cho đại diện thống nhất giữa ngôn ngữ, hình ảnh và đám mây điểm[cite: 3].
*   **Girdhar et al. (2023):** ImageBind về Embedding chung cho 6 loại dữ liệu[cite: 3].
*   **Zheng et al. (2023):** Nghiên cứu về MT-Bench và sự tương quan giữa GPT-4 với đánh giá của con người[cite: 3].
*   **Dubois et al. (2023):** AlpacaEval và tương quan với Chat Arena[cite: 3].
*   **Sellam et al. (2020):** Thước đo BLEURT dựa trên học máy[cite: 3].
*   **Kim et al. (2023):** Mô hình Prometheus làm giám khảo đánh giá[cite: 3].
*   **Wang et al. (2023):** PandaLM - mô hình chuyên biệt để đánh giá mô hình khác[cite: 3].
*   **Zhu et al. (2023):** JudgeLM[cite: 3].
*   **Goyal et al. (2016), Lee et al. (2018), Nie et al. (2019), Zhou et al. (2020):** Các nghiên cứu tiền đề về đo lường ảo giác trong sinh văn bản[cite: 3].
*   **Press et al. (2022), Gou et al. (2023), Valmeekamet et al. (2023):** Các kỹ thuật tự phê bình (self-critique) để cải thiện phản hồi[cite: 3].

## Chương 4

**1. Tên chương:** Chapter 4. Evaluate AI Systems[cite: 4]

**2. Nội dung chi tiết:**
*   Chương này tập trung vào cách xây dựng quy trình đánh giá hệ thống AI trong bối cảnh ứng dụng thực tế, thay vì chỉ dựa trên lý thuyết[cite: 4].
*   **Phát triển dựa trên đánh giá (Evaluation-driven development):** Khuyến nghị định nghĩa các tiêu chí đánh giá trước khi bắt đầu xây dựng ứng dụng để đảm bảo lợi nhuận đầu tư (ROI) và giá trị thực tế[cite: 4].
*   **Các nhóm tiêu chí đánh giá chính:** Bao gồm khả năng chuyên biệt theo miền (domain-specific), khả năng tạo nội dung (generation), khả năng tuân thủ hướng dẫn (instruction-following), cùng với chi phí và độ trễ (latency)[cite: 4].
*   **Khả năng chuyên biệt:** Sử dụng các bài kiểm tra trắc nghiệm (MCQ) hoặc độ chính xác thực thi (functional correctness) đối với tác vụ lập trình để đo lường kiến thức và suy luận[cite: 4].
*   **Khả năng tạo nội dung:** Chuyển trọng tâm từ các thước đo truyền thống (như độ trôi chảy) sang đo lường tính nhất quán thực tế (factual consistency) và an toàn (safety)[cite: 4].
*   **Tính nhất quán thực tế:** Được chia thành nhất quán cục bộ (so với ngữ cảnh cho trước) và nhất quán toàn cục (so với kiến thức mở), thường sử dụng phương pháp "AI làm giám khảo" để xác minh[cite: 4].
*   **Khả năng tuân thủ hướng dẫn:** Đánh giá mức độ mô hình tuân thủ định dạng (ví dụ: JSON, YAML) và các quy tắc phong cách thông qua các benchmark như IFEval và INFOBench[cite: 4].
*   **Lựa chọn mô hình (Build vs. Buy):** Phân tích sự đánh đổi giữa việc sử dụng API thương mại (tiện lợi, hiệu suất cao) và tự lưu trữ mô hình nguồn mở (quyền riêng tư, khả năng kiểm soát, tùy biến)[cite: 4].
*   **Vấn đề ô nhiễm dữ liệu (Data contamination):** Cảnh báo về việc các mô hình được huấn luyện trên chính dữ liệu của các bộ benchmark công khai, làm sai lệch kết quả đánh giá thực tế[cite: 4].
*   **Thiết kế Pipeline đánh giá:** Quy trình gồm 3 bước: đánh giá từng thành phần độc lập, tạo hướng dẫn đánh giá chi tiết với thang điểm cụ thể, và kết nối các số đo AI với số đo kinh doanh thực tế[cite: 4].
*   **Sử dụng Logprobs:** Khuyến khích sử dụng xác suất của token để đo lường độ tin cậy của mô hình, đặc biệt hữu ích trong các tác vụ phân loại[cite: 4].

**3. Các bài báo trong bài:**
*   **Li et al. (2023):** Benchmark BIRD-SQL về hiệu suất và độ chính xác của SQL[cite: 4].
*   **Hendrycks et al. (2020):** Benchmark MMLU (Massive Multitask Language Understanding)[cite: 4].
*   **Microsoft (2023):** Benchmark AGIEval đánh giá năng lực AI thông qua các kỳ thi của con người[cite: 4].
*   **Alzahrani et al. (2024):** Nghiên cứu về độ nhạy của mô hình đối với các thay đổi nhỏ trong prompt[cite: 4].
*   **Lin et al. (2022):** "TruthfulQA: Measuring How Models Mimic Human Falsehoods"[cite: 4].
*   **Manakul et al. (2023):** "SelfCheckGPT" phương pháp tự kiểm tra ảo giác của mô hình[cite: 4].
*   **Wei et al. (2024):** "Long-Form Factuality in Large Language Models" giới thiệu hệ thống SAFE[cite: 4].
*   **Inan et al. (2023):** Bài báo về "Llama Guard" của Meta liên quan đến an toàn mô hình[cite: 4].
*   **Feng et al. (2023), Motoki et al. (2023), Hartman et al. (2023):** Các nghiên cứu về định kiến chính trị trong mô hình AI[cite: 4].
*   **Gehman et al. (2020):** Benchmark "RealToxicityPrompts" đo lường độc tính[cite: 4].
*   **Dhamala et al. (2021):** Benchmark "BOLD" về định kiến trong tạo ngôn ngữ mở[cite: 4].
*   **Zhou et al. (2023):** Benchmark "IFEval" về khả năng tuân thủ hướng dẫn định dạng[cite: 4].
*   **Qin et al. (2024):** Benchmark "INFOBench" mở rộng khái niệm tuân thủ hướng dẫn[cite: 4].
*   **Wang et al. (2023):** Benchmark "RoleLLM" đánh giá khả năng nhập vai[cite: 4].
*   **Tu et al. (2024):** "CharacterEval" đánh giá các khía cạnh khác nhau của việc nhập vai[cite: 4].
*   **Rylan Schaeffer (2023):** Bài báo châm biếm "Pretraining on the Test Set Is All You Need" về ô nhiễm dữ liệu[cite: 4].
*   **Brown et al. (2020):** Phân tích của OpenAI về sự ô nhiễm benchmark của GPT-3[cite: 4].

## Chương 5

**1. Tên chương:** Chapter 5. Prompt Engineering[cite: 5]

**2. Nội dung chi tiết:**
*   **Khái niệm cốt lõi:** Kỹ nghệ gợi ý (Prompt Engineering) là quá trình thiết kế các chỉ dẫn để mô hình tạo ra kết quả mong muốn mà không cần thay đổi trọng số mô hình như tinh chỉnh (finetuning)[cite: 5].
*   **Học trong ngữ cảnh (In-context Learning):** Khả năng mô hình học các hành vi mới từ ví dụ trong prompt, bao gồm zero-shot (không ví dụ) và few-shot (có ví dụ)[cite: 5].
*   **Cấu trúc Prompt:** Thường bao gồm mô tả nhiệm vụ (task description), các ví dụ minh họa (examples) và nội dung tác vụ cụ thể (the task)[cite: 5].
*   **Phân loại Prompt:** Phân chia thành prompt hệ thống (system prompt - thiết lập vai trò/quy tắc) và prompt người dùng (user prompt - yêu cầu cụ thể) dựa trên các mẫu chat (chat templates) của mô hình[cite: 5].
*   **Độ dài ngữ cảnh (Context Length):** Sự phát triển vượt bậc về giới hạn ngữ cảnh (từ 1K lên đến 2M token) giúp mô hình xử lý được lượng thông tin khổng lồ như toàn bộ codebase hoặc nhiều cuốn sách[cite: 5].
*   **Nguyên tắc "Lý ở đầu và cuối":** Mô hình thường xử lý thông tin ở đầu và cuối prompt tốt hơn ở giữa, được kiểm chứng qua bài kiểm tra "Kim trong đống cỏ khô" (Needle in a Haystack)[cite: 5].
*   **Kỹ thuật viết chỉ dẫn:** Bao gồm mô tả rõ ràng, yêu cầu mô hình đóng vai (persona), cung cấp ví dụ định dạng và chỉ định cụ thể định dạng đầu ra (như JSON)[cite: 5].
*   **Phân rã nhiệm vụ phức tạp:** Chia các tác vụ lớn thành chuỗi các bước đơn giản (như phân loại ý định trước khi phản hồi) để tăng độ chính xác và khả năng gỡ lỗi[cite: 5].
*   **Chuỗi suy nghĩ (Chain-of-Thought):** Yêu cầu mô hình "suy nghĩ từng bước" để cải thiện khả năng lập luận và giảm ảo giác[cite: 5].
*   **Phòng thủ gợi ý (Defensive Prompt Engineering):** Chống lại các cuộc tấn công như trích xuất prompt, bẻ khóa (jailbreaking) và tiêm lệnh (prompt injection) thông qua phân cấp chỉ dẫn (Instruction Hierarchy) và các biện pháp ở cấp độ hệ thống[cite: 5].

**3. Các bài báo trong bài:**
*   **Brown et al. (2020):** "Language Models Are Few-shot Learners" (Bài báo về GPT-3).[cite: 5]
*   **Liu et al. (2023):** "Lost in the Middle: How Language Models Use Long Contexts".[cite: 5]
*   **Wallace et al. (2024):** "The Instruction Hierarchy: Training LLMs to Prioritize Privileged Instructions" (Nghiên cứu của OpenAI).[cite: 5]
*   **Wei et al. (2022):** "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models".[cite: 5]
*   **Hsieh et al. (2024):** Nghiên cứu về benchmark RULER để đánh giá xử lý ngữ cảnh dài.[cite: 5]
*   **Ding et al. (2021):** "OpenPrompt: An Open-source Framework for Prompt-learning".[cite: 5]
*   **Khattab et al. (2023):** "DSPy: Compiling Declarative Language Model Calls into Self-Improving Pipelines".[cite: 5]
*   **Fernando et al. (2023):** "Promptbreeder: Self-Referential Self-Improvement Via Prompt Evolution" (DeepMind).[cite: 5]
*   **Yuksekgonul et al. (2024):** "TextGrad: Automatic "Differentiation" via Text".[cite: 5]
*   **Zou et al. (2023):** "Universal and Transferable Adversarial Attacks on Aligned Language Models".[cite: 5]
*   **Chao et al. (2023):** "Jailbreaking Black Box Large Language Models in Twenty Queries" (Giới thiệu PAIR).[cite: 5]
*   **Greshake et al. (2023):** Nghiên cứu về tiêm lệnh gián tiếp (Indirect Prompt Injection).[cite: 5]
*   **Carlini et al. (2020/2023):** Các nghiên cứu về trích xuất dữ liệu huấn luyện từ GPT và các mô hình Diffusion.[cite: 5]
*   **Nasr et al. (2023):** "Scalable Extraction of Training Data from (Production) Language Models".[cite: 5]
*   **Petroni et al. (2019):** Benchmark LAMA để thăm dò kiến thức quan hệ của mô hình.[cite: 5]
*   **Chen et al. (2019/2022):** Các nghiên cứu về quyền riêng tư và benchmark Advbench.[cite: 5]
*   **Pedro et al. (2023):** "From Prompt Injections to SQL Injection Attacks".[cite: 5]

## Chương 6

**1. Tên chương:** Chapter 6. RAG and Agents[cite: 6]

**2. Nội dung chi tiết:**
*   Chương này tập trung vào cách xây dựng ngữ cảnh (context) liên quan cho từng truy vấn thông qua hai mô hình thống trị: RAG (Truy xuất tăng cường tạo) và Tác tử (Agents)[cite: 6].
*   RAG giúp mô hình vượt qua giới hạn độ dài ngữ cảnh bằng cách truy xuất thông tin từ các nguồn dữ liệu bên ngoài (như cơ sở dữ liệu nội bộ hoặc internet) trước khi tạo phản hồi[cite: 6].
*   Cơ chế RAG bao gồm hai thành phần chính: bộ truy xuất (retriever) để tìm thông tin phù hợp và bộ tạo (generator) để xử lý thông tin đó thành câu trả lời[cite: 6].
*   Các thuật toán truy xuất phổ biến bao gồm truy xuất dựa trên thuật ngữ (như BM25, TF-IDF) và truy xuất dựa trên embedding (truy xuất ngữ nghĩa) sử dụng cơ sở dữ liệu vector[cite: 6].
*   Tối ưu hóa truy xuất có thể được thực hiện thông qua các chiến lược chia nhỏ dữ liệu (chunking), xếp hạng lại (reranking), viết lại truy vấn (query rewriting) và truy xuất theo ngữ cảnh[cite: 6].
*   RAG không chỉ giới hạn ở văn bản mà còn mở rộng sang dữ liệu đa phương thức (hình ảnh, video) và dữ liệu dạng bảng (thông qua Text-to-SQL)[cite: 6].
*   Tác tử (Agent) được định nghĩa là hệ thống có khả năng nhận thức môi trường và sử dụng các công cụ để thực hiện các hành động nhằm đạt được mục tiêu cụ thể[cite: 6].
*   Khả năng của tác tử phụ thuộc vào kho công cụ (tool inventory) và bộ lập kế hoạch (planner) dựa trên AI để phân rã các nhiệm vụ phức tạp thành các bước nhỏ[cite: 6].
*   Quy trình hoạt động của tác tử thường bao gồm: lập kế hoạch, phản chiếu (reflection) để sửa lỗi, thực thi công cụ và đánh giá kết quả[cite: 6].
*   Các mô hình như ReAct và Reflexion cho thấy việc đan xen giữa lập luận và hành động giúp cải thiện đáng kể hiệu suất của tác tử[cite: 6].
*   Hệ thống bộ nhớ (Memory) đóng vai trò quan trọng trong việc duy trì thông tin qua các phiên làm việc, bao gồm bộ nhớ ngắn hạn (ngữ cảnh hiện tại) và bộ nhớ dài hạn (truy xuất từ bên ngoài)[cite: 6].

**3. Các bài báo trong bài:**
*   **Chen et al. (2017):** "Reading Wikipedia to Answer Open-Domain Questions" (Giới thiệu mô hình truy xuất-rồi-tạo)[cite: 6].
*   **Lewis et al. (2020):** "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" (Đưa ra thuật ngữ RAG)[cite: 6].
*   **Formal et al. (2021):** Nghiên cứu về thuật toán SPLADE sử dụng embedding thưa[cite: 6].
*   **Johnson et al. (2017):** Thư viện FAISS (Facebook AI Similarity Search)[cite: 6].
*   **Sun et al. (2020):** ScaNN (Scalable Nearest Neighbors) của Google[cite: 6].
*   **Malkov and Yashunin (2016):** Thuật toán HNSW cho tìm kiếm láng giềng gần nhất[cite: 6].
*   **Jégou et al. (2011):** Phương pháp Product Quantization để tối ưu hóa vector[cite: 6].
*   **Muennighoff et al. (2023):** Benchmark MTEB đánh giá chất lượng embedding[cite: 6].
*   **Thakur et al. (2021):** BEIR (Benchmarking IR) - hệ thống đánh giá truy xuất[cite: 6].
*   **Cormack et al. (2009):** Thuật toán Reciprocal Rank Fusion (RRF)[cite: 6].
*   **Radford et al. (2021):** Kiến trúc CLIP cho embedding đa phương thức[cite: 6].
*   **Yang et al. (2024):** SWE-agent - tác tử hỗ trợ lập trình[cite: 6].
*   **Lu et al. (2023):** Chameleon - hệ thống tác tử sử dụng nhiều công cụ[cite: 6].
*   **Yao et al. (2022):** Khung làm việc ReAct (Reason + Act)[cite: 6].
*   **Shinn et al. (2023):** Khung làm việc Reflexion hỗ trợ tự phản chiếu và sửa lỗi[cite: 6].
*   **Wang et al. (2023):** Voyager - tác tử có khả năng học kỹ năng mới[cite: 6].
*   **Hao et al. (2023):** "Reasoning with Language Model is Planning with World Model"[cite: 6].
*   **Schick et al. (2023):** Toolformer - mô hình tự học cách sử dụng công cụ[cite: 6].

## Chương 7

**1. Tên chương:** Chapter 7. Finetuning[cite: 7]

**2. Nội dung chi tiết:**
*   **Khái niệm:** Tinh chỉnh (Finetuning) là quá trình thích ứng mô hình cho các tác vụ cụ thể bằng cách huấn luyện thêm để điều chỉnh trọng số, khác với các phương pháp dựa trên gợi ý (prompt-based)[cite: 7].
*   **Mục đích:** Cải thiện chất lượng mô hình, khả năng tuân thủ hướng dẫn, định dạng đầu ra (JSON, YAML), giảm thiểu định kiến (bias) và tăng hiệu quả cho các mô hình nhỏ[cite: 7].
*   **Học chuyển đổi (Transfer Learning):** Finetuning tận dụng tri thức từ việc huấn luyện trước (pre-training) trên tập dữ liệu khổng lồ để áp dụng vào các tác vụ chuyên biệt với ít dữ liệu hơn[cite: 7].
*   **Finetuning và RAG:** Finetuning thường dùng để điều chỉnh "hình thức" (phong cách, cấu trúc), trong khi RAG được dùng để cung cấp "sự thật" (thông tin mới nhất, dữ liệu riêng tư)[cite: 7].
*   **Điểm nghẽn bộ nhớ:** Quá trình huấn luyện đòi hỏi bộ nhớ GPU rất lớn để lưu trữ không chỉ trọng số mà còn cả gradient, trạng thái trình tối ưu hóa (optimizer states) và kích hoạt (activations)[cite: 7].
*   **Biểu diễn số học:** Sử dụng các định dạng dấu phẩy động như FP16, BF16 hoặc TF32 giúp cân bằng giữa độ chính xác và dung lượng bộ nhớ[cite: 7].
*   **Lượng tử hóa (Quantization):** Kỹ thuật giảm độ chính xác của các giá trị số (ví dụ từ 16-bit xuống 4-bit) để giảm đáng kể dấu chân bộ nhớ và tăng tốc tính toán[cite: 7].
*   **PEFT (Parameter-Efficient Finetuning):** Các phương pháp tinh chỉnh hiệu quả tham số giúp đạt hiệu suất gần bằng tinh chỉnh toàn bộ nhưng chỉ cập nhật một phần rất nhỏ tham số[cite: 7].
*   **LoRA (Low-Rank Adaptation):** Kỹ thuật PEFT phổ biến nhất hiện nay, hoạt động bằng cách phân rã các ma trận trọng số thành các ma trận nhỏ hơn để huấn luyện, sau đó gộp lại mà không làm tăng độ trễ suy luận[cite: 7].
*   **Hợp nhất mô hình (Model Merging):** Kỹ thuật kết hợp nhiều mô hình đã tinh chỉnh (thường thông qua cộng trọng số hoặc xếp chồng lớp) để tạo ra mô hình đa nhiệm mà không cần huấn luyện lại từ đầu[cite: 7].

**3. Các bài báo trong bài:**
*   **Bozinovski and Fulgosi (1976):** Nghiên cứu đầu tiên giới thiệu về Transfer Learning[cite: 7].
*   **Johnson et al. (2016):** Hệ thống dịch thuật đa ngôn ngữ của Google[cite: 7].
*   **OpenAI (2022):** Bài báo về InstructGPT[cite: 7].
*   **Rozière et al. (2024):** Nghiên cứu về các mô hình Code Llama[cite: 7].
*   **Wang and Russakovsky (2023):** Giảm thiểu định kiến thông qua dữ liệu tinh chỉnh[cite: 7].
*   **Garimella et al. (2022):** Tinh chỉnh để giảm định kiến giới tính và chủng tộc[cite: 7].
*   **Chung et al. (2022):** Nghiên cứu về mô hình Flan-T5[cite: 7].
*   **Wu et al. (2023):** Giới thiệu mô hình BloombergGPT[cite: 7].
*   **Li et al. (2023):** So sánh GPT-4 và BloombergGPT trong lĩnh vực tài chính[cite: 7].
*   **Ovadia et al. (2024):** "Fine-Tuning or Retrieval?"[cite: 7].
*   **Korthikanti et al. (2022):** Giảm tái tính toán kích hoạt trong các mô hình Transformer lớn[cite: 7].
*   **Dettmers et al. (2022/2023):** Các nghiên cứu về LLM.int8() và QLoRA[cite: 7].
*   **Ma et al. (2024):** Nghiên cứu về mô hình BitNet 1-bit[cite: 7].
*   **Houlsby et al. (2019):** Giới thiệu phương pháp PEFT dựa trên Adapter cho BERT[cite: 7].
*   **Hu et al. (2021):** "LoRA: Low-Rank Adaptation of Large Language Models"[cite: 7].
*   **Li and Liang (2021), Lester et al. (2021):** Các nghiên cứu về Prefix-tuning và Prompt tuning[cite: 7].
*   **Yadav et al. (2023):** TIES-Merging để giải quyết xung đột khi hợp nhất mô hình[cite: 7].
*   **Komatsuzaki et al. (2022):** "Sparse Upcycling" huấn luyện MoE từ các điểm kiểm tra dày đặc[cite: 7].

## Chương 8

**1. Tên chương:** Chapter 8. Dataset Engineering[cite: 8]

**2. Nội dung chi tiết:**
*   **Tầm quan trọng của dữ liệu:** Chất lượng mô hình phụ thuộc trực tiếp vào chất lượng dữ liệu huấn luyện; kỹ nghệ dữ liệu nhằm tạo ra tập dữ liệu tối ưu trong ngân sách cho phép[cite: 8].
*   **AI hướng dữ liệu (Data-centric AI):** Xu hướng chuyển dịch từ cải thiện kiến trúc mô hình sang cải thiện hiệu suất thông qua làm sạch, làm giàu và tối ưu hóa tập dữ liệu[cite: 8].
*   **Ba tiêu chí cốt lõi:** Thiết kế tập dữ liệu dựa trên sự cân bằng giữa chất lượng (Quality), độ bao phủ/đa dạng (Coverage) và số lượng (Quantity)[cite: 8].
*   **Chất lượng dữ liệu:** Định nghĩa qua 6 đặc tính: tính liên quan, sự căn chỉnh với yêu cầu tác vụ, tính nhất quán, định dạng đúng, tính duy nhất và tuân thủ chính sách[cite: 8].
*   **Độ bao phủ và đa dạng:** Dữ liệu cần phản ánh sự đa dạng của các vấn đề thực tế (ngôn ngữ, định dạng, độ dài) để mô hình có khả năng tổng quát hóa tốt[cite: 8].
*   **Số lượng dữ liệu:** Ít dữ liệu chất lượng cao có thể tốt hơn nhiều dữ liệu nhiễu; kỹ thuật PEFT cần ít dữ liệu hơn đáng kể so với tinh chỉnh toàn bộ[cite: 8].
*   **Tổng hợp dữ liệu (Data Synthesis):** Sử dụng AI để tạo ra dữ liệu huấn luyện (như dữ liệu lập trình, lập luận chuỗi suy nghĩ) giúp tăng quy mô và giảm rào cản về quyền riêng tư[cite: 8].
*   **Xác thực dữ liệu:** Dữ liệu do AI tạo ra cần được kiểm tra thông qua tính đúng đắn chức năng (ví dụ: thực thi code) hoặc sử dụng các mô hình AI khác làm giám định[cite: 8].
*   **Sự sụp đổ mô hình (Model Collapse):** Cảnh báo rủi ro khi huấn luyện mô hình đệ quy trên dữ liệu do AI tạo ra, dẫn đến việc mất dần khả năng xử lý các trường hợp hiếm[cite: 8].
*   **Chưng cất mô hình (Model Distillation):** Kỹ thuật huấn luyện mô hình nhỏ (sinh viên) bắt chước hành vi của mô hình lớn (giáo viên) để giảm chi phí suy luận[cite: 8].
*   **Quy trình xử lý dữ liệu:** Bao gồm kiểm tra thống kê, loại bỏ trùng lặp (deduplication), làm sạch các thẻ định dạng dư thừa (HTML/Markdown) và định dạng lại theo mẫu chat của mô hình[cite: 8].

**3. Các bài báo trong bài:**
*   **Gadre et al. (2023):** "DataComp: In search of the next generation of multimodal datasets"[cite: 8].
*   **Radford et al. (2021):** Nghiên cứu về mô hình CLIP[cite: 8].
*   **Li et al. (2024):** Cuộc thi DataComp-LM đánh giá tập dữ liệu cho mô hình ngôn ngữ[cite: 8].
*   **Chun et al. (2024):** "Scaling Instruction-Finetuned Language Models" về dữ liệu CoT[cite: 8].
*   **Dubey et al. (2024):** Báo cáo kỹ thuật Llama 3 về thiết kế dữ liệu đa thông điệp[cite: 8].
*   **Young et al. (2024):** Nghiên cứu về dòng mô hình Yi[cite: 8].
*   **Zhou et al. (2023):** "LIMA: Less Is More for Alignment"[cite: 8].
*   **Shen et al. (2024):** "The Data Addition Dilemma"[cite: 8].
*   **Hernandez et al. (2021):** Nghiên cứu về hiện tượng "ossification" (hóa thạch) của trọng số mô hình[cite: 8].
*   **Perez et al. (2022):** "Discovering Language Model Behaviors with Model-Written Evaluations"[cite: 8].
*   **Gekhman et al. (2022):** "TrueTeacher" về tổng hợp dữ liệu để phát hiện ảo giác[cite: 8].
*   **Trinh et al. (2024):** "AlphaGeometry" huấn luyện trên 100 triệu ví dụ tổng hợp[cite: 8].
*   **Krizhevsky et al. (2012):** AlexNet và tăng cường dữ liệu hình ảnh[cite: 8].
*   **Deng et al. (2009):** Tập dữ liệu ImageNet[cite: 8].
*   **Su et al. (2017):** "One Pixel Attack for Fooling Deep Neural Networks"[cite: 8].
*   **Dosovitskiy et al. (2017):** Trình giả lập CARLA cho xe tự lái[cite: 8].
*   **Silver et al. (2016):** AlphaGo và kỹ thuật tự chơi (self-play)[cite: 8].
*   **Gudibande et al. (2023):** "The False Promise of Imitating Proprietary LLMs"[cite: 8].
*   **Shumailov et al. (2023):** "The Curse of Recursion" về sụp đổ mô hình[cite: 8].
*   **Hinton et al. (2015):** "Distilling the Knowledge in a Neural Network"[cite: 8].

## Chương 9

**1. Tên chương:** Chapter 9. Inference Optimization[cite: 9]

**2. Nội dung chi tiết:**
*   Chương này tập trung vào việc tối ưu hóa suy luận (inference) để làm cho mô hình chạy nhanh hơn và rẻ hơn, một yếu tố sống còn cho khả năng mở rộng ứng dụng AI[cite: 9].
*   **Điểm nghẽn tính toán:** Được chia thành hai loại chính là giới hạn tính toán (compute-bound) và giới hạn băng thông bộ nhớ (memory bandwidth-bound)[cite: 9].
*   **Suy luận mô hình ngôn ngữ (LLM):** Gồm hai giai đoạn: *Prefill* (xử lý token đầu vào song song, giới hạn bởi tính toán) và *Decode* (tạo từng token đầu ra, giới hạn bởi băng thông bộ nhớ)[cite: 9].
*   **Các chỉ số hiệu suất:** Bao gồm TTFT (thời gian đến token đầu tiên), TPOT (thời gian trên mỗi token đầu ra), thông lượng (throughput) và Goodput (số yêu cầu đáp ứng SLO)[cite: 9].
*   **Tối ưu hóa mức mô hình:** Sử dụng nén mô hình (lượng tử hóa, chưng cất tri thức, cắt tỉa), mã hóa suy đoán (speculative decoding) và giải mã song song để phá vỡ sự phụ thuộc tuần tự[cite: 9].
*   **Tối ưu hóa cơ chế chú ý:** Sử dụng KV Cache để tránh tính toán lại các vector Key-Value cũ, cùng các biến thể như Grouped-query attention hoặc FlashAttention[cite: 9].
*   **Tối ưu hóa dịch vụ:** Áp dụng các chiến lược gom lô (batching) như *Continuous Batching* (gom lô liên tục) và tách biệt (disaggregation) giữa các thực thể Prefill và Decode[cite: 9].
*   **Prompt Caching:** Lưu trữ và tái sử dụng các phân đoạn văn bản trùng lặp (như system prompt) để giảm tới 90% chi phí và 75% độ trễ[cite: 9].
*   **Phần cứng AI:** Tận dụng các bộ tăng tốc (AI Accelerators) như GPU, TPU với kiến trúc phân cấp bộ nhớ (SRAM, HBM, DRAM) và các kernel (CUDA, Triton) được tối ưu riêng[cite: 9].
*   **Chiến lược song song:** Bao gồm song song bản sao (replica), song song tensor (chia nhỏ ma trận) và song song đường ống (pipeline) để xử lý các mô hình quá lớn[cite: 9].

**3. Các bài báo trong bài:**
*   **Williams et al. (2009):** "Roofline: An Insightful Visual Performance Model for Multicore Architectures"[cite: 9].
*   **Stern et al. (2018):** "Blockwise Parallel Decoding for Deep Autoregressive Models"[cite: 9].
*   **Chen et al. (2023):** Nghiên cứu của DeepMind về mã hóa suy đoán cho mô hình Chinchilla-70B[cite: 9].
*   **Yang et al. (2023):** "Inference with Reference: Lossless Acceleration of Large Language Models"[cite: 9].
*   **Cai et al. (2024):** "Medusa: Simple LLM Inference Acceleration Service with Multiple Decoding Heads"[cite: 9].
*   **Pope et al. (2022):** "Efficiently Scaling Transformer Inference"[cite: 9].
*   **Beltagy et al. (2020):** "Longformer: The Long-Document Transformer" (Local windowed attention)[cite: 9].
*   **Ainslie et al. (2023):** "GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints"[cite: 9].
*   **Kwon et al. (2023):** "Efficient Memory Management for Large Language Model Serving with PagedAttention"[cite: 9].
*   **Dao et al. (2022):** "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness"[cite: 9].
*   **Zhong et al. (2024):** "DistServe: Disaggregating Prefill and Decoding for Goodput-optimized LLM Serving"[cite: 9].
*   **Hu et al. (2024):** "Inference Without Interference: Disaggregate LLM Inference for Higher Throughput"[cite: 9].
*   **Gim et al. (2023):** Nghiên cứu giới thiệu về Prompt Cache[cite: 9].
*   **Chowdhery et al. (2022):** Báo cáo kỹ thuật mô hình PaLM (giới thiệu chỉ số MFU)[cite: 9].
*   **Yu et al. (2022):** "Orca: A Distributed Serving System for Transformer-Based Generative Models"[cite: 9].

## Chương 10

**1. Tên chương:** Chapter 10. AI Engineering Architecture and User Feedback[cite: 10]

**2. Nội dung chi tiết:**
*   **Kiến trúc AI lũy tiến:** Chương này đề xuất một lộ trình phát triển hệ thống AI từ đơn giản (chỉ có Model API) đến phức tạp, bằng cách dần thêm các thành phần như RAG, bảo vệ, định tuyến và bộ nhớ đệm[cite: 10].
*   **Tăng cường ngữ cảnh (Step 1):** Tương tự như kỹ nghệ đặc trưng trong ML truyền thống, bước này cung cấp cho mô hình thông tin cần thiết thông qua truy xuất dữ liệu bên ngoài hoặc sử dụng công cụ (search, API)[cite: 10].
*   **Thiết lập rào chắn (Step 2):** Sử dụng các lớp bảo vệ đầu vào (chống rò rỉ PII, tấn công prompt) và đầu ra (kiểm soát định dạng, tính nhất quán thực tế, độc tính) để đảm bảo an toàn hệ thống[cite: 10].
*   **Model Router và Gateway (Step 3):** Router giúp điều hướng truy vấn đến các mô hình chuyên biệt hoặc rẻ hơn dựa trên ý định; Gateway cung cấp giao diện thống nhất, kiểm soát quyền truy cập và quản lý chi phí[cite: 10].
*   **Tối ưu hóa bằng Caching (Step 4):** Áp dụng bộ nhớ đệm chính xác (Exact Caching) cho các yêu cầu giống hệt và bộ nhớ đệm ngữ nghĩa (Semantic Caching) cho các yêu cầu tương đồng để giảm độ trễ và chi phí[cite: 10].
*   **Mô hình Tác tử (Step 5):** Chuyển từ luồng tuần tự sang các vòng lặp phản hồi (feedback loops) và cho phép mô hình thực hiện các "hành động ghi" (write actions) như gửi email hay cập nhật cơ sở dữ liệu[cite: 10].
*   **Khả năng quan sát (Observability):** Tập trung vào việc đo lường các chỉ số như MTTD, MTTR và CFR thông qua nhật ký (logs), vết (traces) và các chỉ số (metrics) để phát hiện sự thay đổi hành vi người dùng hoặc sự cố mô hình[cite: 10].
*   **Điều phối Pipeline (Orchestration):** Sử dụng các công cụ như LangChain hoặc LlamaIndex để kết nối các thành phần rời rạc thành một quy trình đầu-cuối liền mạch[cite: 10].
*   **Phản hồi người dùng (User Feedback):** Đóng vai trò là dữ liệu độc quyền giúp tạo ra "bánh đà dữ liệu" (data flywheel) để liên tục cải thiện và cá nhân hóa mô hình[cite: 10].
*   **Phản hồi hội thoại:** Khai thác các tín hiệu ngầm định từ hội thoại như việc người dùng dừng sinh văn bản, sửa lỗi mô hình, hoặc thay đổi cách diễn đạt để đánh giá chất lượng phản hồi[cite: 10].
*   **Thiết kế hệ thống phản hồi:** Phản hồi cần được thu thập một cách tự nhiên, không gây gián đoạn quy trình làm việc của người dùng và cần minh bạch về cách thức sử dụng dữ liệu đó[cite: 10].
*   **Hạn chế của phản hồi:** Cần lưu ý các định kiến như "thiên kiến khoan dung" (leniency bias), tính ngẫu nhiên của người dùng và rủi ro tạo ra các vòng lặp phản hồi suy thoái (degenerate feedback loops) dẫn đến sự nịnh bợ của AI[cite: 10].

**3. Các bài báo trong bài:**
*   **Wallace et al. (2024):** "The Instruction Hierarchy: Training LLMs to Prioritize Privileged Instructions"[cite: 10].
*   **Chen et al. (2023):** Nghiên cứu về sự thay đổi hiệu suất của GPT-4 và GPT-3.5 theo thời gian[cite: 10].
*   **Shankar et al. (2024):** Nghiên cứu về sự thay đổi nhận thức của nhà phát triển đối với đầu ra của mô hình[cite: 10].
*   **Liu et al. (2020):** Nghiên cứu về cách người dùng tương tác và "bắt nạt" xe tự lái[cite: 10].
*   **Xu et al. (2022) / Yuan et al. (2023):** Phân tích tập dữ liệu FITS (Feedback for Interactive Talk & Search)[cite: 10].
*   **Fu et al. (2019), Goyal et al. (2019), Zhou and Small (2020), Sumers et al. (2020):** Các nghiên cứu về việc học máy từ phản hồi ngôn ngữ tự nhiên[cite: 10].
*   **Ponnusamy et al. (2019), Park et al. (2020):** Các ứng dụng AI hội thoại sớm như Amazon Alexa[cite: 10].
*   **Xiao et al. (2021):** Tính năng điều khiển bằng giọng nói của Spotify[cite: 10].
*   **Hashimoto and Sassano (2018):** Yahoo! Voice[cite: 10].
*   **Stray (2023):** Nghiên cứu về việc huấn luyện mô hình dựa trên phản hồi có thể dẫn đến việc AI cung cấp thông tin người dùng muốn nghe thay vì thông tin chính xác[cite: 10].
*   **Sharma et al. (2023):** Nghiên cứu về xu hướng "nịnh bợ" (sycophancy) của các mô hình AI khi được huấn luyện trên phản hồi của con người[cite: 10].