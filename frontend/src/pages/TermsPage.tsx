export default function TermsPage() {
  const sections = [
    {
      title: 'Điều 1. Khái niệm',
      content: (
        <ul className='space-y-3 list-disc pl-5'>
          <li>
            <strong>“ChatPulse”</strong> là nền tảng học tập và hỗ trợ trực tuyến do chúng tôi phát triển và vận hành.
          </li>

          <li>
            <strong>“Người dùng”</strong> là cá nhân đăng ký tài khoản và sử dụng các khóa học, tài liệu hoặc dịch vụ
            trên website.
          </li>

          <li>
            <strong>“Dịch vụ”</strong> bao gồm khóa học trực tuyến, tài liệu học tập, tính năng AI, bài giảng, luyện tập
            và các tiện ích liên quan.
          </li>

          <li>
            <strong>“Tài khoản”</strong> là thông tin đăng nhập được tạo bởi người dùng để truy cập hệ thống.
          </li>
        </ul>
      )
    },

    {
      title: 'Điều 2. Hiệu lực điều khoản',
      content: (
        <div className='space-y-3'>
          <p>
            Khi đăng ký tài khoản hoặc sử dụng dịch vụ trên ChatPulse, người dùng đồng ý tuân thủ toàn bộ nội dung của
            Điều khoản & Điều kiện này.
          </p>

          <p>
            Chúng tôi có quyền cập nhật hoặc thay đổi nội dung điều khoản nhằm phù hợp với hoạt động vận hành và quy
            định pháp luật hiện hành.
          </p>
        </div>
      )
    },

    {
      title: 'Điều 3. Tài khoản người dùng',
      content: (
        <ul className='space-y-3 list-disc pl-5'>
          <li>Người dùng cần cung cấp thông tin chính xác khi đăng ký tài khoản.</li>

          <li>Người dùng chịu trách nhiệm bảo mật tài khoản và mật khẩu của mình.</li>

          <li>Không được chia sẻ, cho thuê hoặc mua bán tài khoản dưới bất kỳ hình thức nào.</li>

          <li>ChatPulse có quyền khóa hoặc tạm ngưng tài khoản nếu phát hiện hành vi vi phạm điều khoản sử dụng.</li>
        </ul>
      )
    },

    {
      title: 'Điều 4. Thanh toán & dịch vụ',
      content: (
        <ul className='space-y-3 list-disc pl-5'>
          <li>Giá của các khóa học và dịch vụ sẽ được hiển thị công khai trên website.</li>

          <li>Sau khi thanh toán thành công, người dùng sẽ được cấp quyền truy cập khóa học tương ứng.</li>

          <li>Các khóa học đã mua không được hoàn trả hoặc chuyển nhượng trừ trường hợp đặc biệt.</li>

          <li>Chúng tôi có thể thay đổi giá dịch vụ hoặc chương trình ưu đãi vào từng thời điểm.</li>
        </ul>
      )
    },

    {
      title: 'Điều 5. Quyền sở hữu trí tuệ',
      content: (
        <div className='space-y-3'>
          <p>
            Toàn bộ nội dung trên ChatPulse bao gồm bài giảng, hình ảnh, video, tài liệu, giao diện và mã nguồn đều
            thuộc quyền sở hữu của hệ thống.
          </p>

          <ul className='space-y-3 list-disc pl-5'>
            <li>Sao chép hoặc phát tán nội dung khi chưa được cho phép.</li>

            <li>Ghi hình, tải xuống hoặc chia sẻ trái phép khóa học.</li>

            <li>Sử dụng nội dung cho mục đích thương mại.</li>
          </ul>
        </div>
      )
    },

    {
      title: 'Điều 6. Quyền và nghĩa vụ của người dùng',
      content: (
        <ul className='space-y-3 list-disc pl-5'>
          <li>Sử dụng dịch vụ đúng mục đích học tập và đúng quy định pháp luật.</li>

          <li>Không thực hiện các hành vi gây ảnh hưởng đến hệ thống hoặc người dùng khác.</li>

          <li>Chịu trách nhiệm với mọi hoạt động phát sinh từ tài khoản của mình.</li>
        </ul>
      )
    },

    {
      title: 'Điều 7. Chính sách bảo mật',
      content: (
        <div className='space-y-3'>
          <p>
            ChatPulse cam kết bảo vệ thông tin cá nhân của người dùng và chỉ sử dụng dữ liệu nhằm mục đích cung cấp, cải
            thiện dịch vụ và hỗ trợ khách hàng.
          </p>

          <p>
            Thông tin cá nhân sẽ không được chia sẻ cho bên thứ ba nếu không có sự đồng ý của người dùng, ngoại trừ
            trường hợp theo yêu cầu của pháp luật.
          </p>
        </div>
      )
    },

    {
      title: 'Điều 8. Điều khoản chung',
      content: (
        <div className='space-y-3'>
          <p>
            Nếu có bất kỳ thắc mắc hoặc yêu cầu hỗ trợ, người dùng có thể liên hệ với chúng tôi thông qua email hoặc các
            kênh hỗ trợ chính thức trên website.
          </p>

          <p>
            Trong trường hợp một phần của Điều khoản này không còn hiệu lực theo quy định pháp luật, các nội dung còn
            lại vẫn giữ nguyên giá trị áp dụng.
          </p>
        </div>
      )
    }
  ]

  return (
    <div className='min-h-screen bg-gradient-to-b from-background via-background to-muted/30'>
      <div className='mx-auto max-w-6xl px-4 py-12 md:px-6'>
        {/* Hero */}
        <div className='relative overflow-hidden rounded-3xl border bg-card p-8 shadow-sm md:p-12'>
          <div className='absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/5' />

          <div className='relative z-10 max-w-3xl space-y-5'>
            <div className='inline-flex items-center rounded-full border bg-background/80 px-4 py-1 text-sm font-medium backdrop-blur'>
              ChatPulse Terms
            </div>

            <h1 className='text-4xl font-bold tracking-tight md:text-5xl'>
              Điều khoản <span className='text-primary'>& Điều kiện</span>
            </h1>

            <p className='text-base leading-7 text-muted-foreground md:text-lg'>
              Bản Điều khoản và Điều kiện này quy định quyền và nghĩa vụ giữa người dùng và hệ thống ChatPulse liên quan
              đến việc đăng ký tài khoản, sử dụng dịch vụ, thanh toán và bảo mật thông tin.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className='mt-10 grid gap-6'>
          {sections.map((section, index) => (
            <section
              key={index}
              className='group rounded-2xl border bg-card/80 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md md:p-8'
            >
              <div className='mb-5 flex items-center gap-4'>
                <div className='flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary'>
                  {index + 1}
                </div>

                <h2 className='text-xl font-semibold tracking-tight md:text-2xl'>{section.title}</h2>
              </div>

              <div className='leading-7 text-muted-foreground'>{section.content}</div>
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className='mt-12 rounded-2xl border bg-card p-6 text-center shadow-sm'>
          <p className='text-sm text-muted-foreground'>
            © {new Date().getFullYear()} ChatPulse. Mọi quyền được bảo lưu.
          </p>
        </div>
      </div>
    </div>
  )
}
