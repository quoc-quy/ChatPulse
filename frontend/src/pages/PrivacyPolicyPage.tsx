export default function PrivacyPolicyPage() {
  const sections = [
    {
      title: 'Điều 1. Định nghĩa',
      content: (
        <div className='space-y-3'>
          <p>
            <strong>“ChatPulse”</strong> là nền tảng học tập và hỗ trợ trực tuyến do chúng tôi phát triển và vận hành.
          </p>

          <p>
            <strong>“Người dùng”</strong> là cá nhân hoặc tổ chức truy cập, đăng ký tài khoản hoặc sử dụng các sản phẩm,
            dịch vụ trên website.
          </p>

          <p>
            <strong>“Đối tác”</strong> là tổ chức hoặc cá nhân hợp tác với chúng tôi trong quá trình cung cấp dịch vụ.
          </p>

          <p>
            <strong>“Dữ liệu cá nhân”</strong> là thông tin giúp xác định danh tính của người dùng như họ tên, email, số
            điện thoại, địa chỉ IP, lịch sử sử dụng dịch vụ hoặc các dữ liệu liên quan khác.
          </p>
        </div>
      )
    },

    {
      title: 'Điều 2. Dữ liệu chúng tôi thu thập',
      content: (
        <ul className='space-y-3 list-disc pl-5'>
          <li>Họ tên, email, số điện thoại.</li>

          <li>Thông tin tài khoản đăng nhập.</li>

          <li>Lịch sử sử dụng dịch vụ và hoạt động trên website.</li>

          <li>Thông tin thiết bị, địa chỉ IP, cookie và trình duyệt.</li>

          <li>Nội dung phản hồi, đánh giá hoặc liên hệ hỗ trợ từ người dùng.</li>
        </ul>
      )
    },

    {
      title: 'Điều 3. Mục đích sử dụng dữ liệu',
      content: (
        <ul className='space-y-3 list-disc pl-5'>
          <li>Cung cấp và vận hành dịch vụ trên website.</li>

          <li>Xác minh tài khoản và hỗ trợ đăng nhập.</li>

          <li>Hỗ trợ khách hàng và giải quyết khiếu nại.</li>

          <li>Nâng cao chất lượng sản phẩm và trải nghiệm người dùng.</li>

          <li>Gửi thông báo, cập nhật hoặc chương trình khuyến mãi.</li>

          <li>Đảm bảo an toàn, bảo mật và phòng chống gian lận.</li>
        </ul>
      )
    },

    {
      title: 'Điều 4. Cách thức lưu trữ và bảo mật dữ liệu',
      content: (
        <div className='space-y-3'>
          <p>
            Chúng tôi áp dụng các biện pháp kỹ thuật và bảo mật phù hợp nhằm bảo vệ dữ liệu cá nhân khỏi truy cập trái
            phép, mất mát hoặc rò rỉ thông tin.
          </p>

          <p>
            Dữ liệu cá nhân được lưu trữ trong phạm vi cần thiết để phục vụ mục đích cung cấp dịch vụ hoặc theo yêu cầu
            của pháp luật.
          </p>

          <p>
            Tuy nhiên, không có hệ thống nào đảm bảo an toàn tuyệt đối trên môi trường internet. Người dùng cần chủ động
            bảo mật tài khoản và thông tin đăng nhập của mình.
          </p>
        </div>
      )
    },

    {
      title: 'Điều 5. Chia sẻ dữ liệu cá nhân',
      content: (
        <div className='space-y-3'>
          <p>
            Chúng tôi cam kết không bán hoặc chia sẻ dữ liệu cá nhân của người dùng cho bên thứ ba, ngoại trừ các trường
            hợp:
          </p>

          <ul className='space-y-3 list-disc pl-5'>
            <li>Có sự đồng ý của người dùng.</li>

            <li>Phục vụ cho việc cung cấp dịch vụ thông qua các đối tác liên quan.</li>

            <li>Theo yêu cầu của cơ quan nhà nước có thẩm quyền theo quy định pháp luật.</li>

            <li>Đảm bảo quyền lợi, an toàn và bảo mật của hệ thống và người dùng.</li>
          </ul>
        </div>
      )
    },

    {
      title: 'Điều 6. Quyền của người dùng',
      content: (
        <ul className='space-y-3 list-disc pl-5'>
          <li>Yêu cầu xem hoặc chỉnh sửa dữ liệu cá nhân.</li>

          <li>Yêu cầu xóa tài khoản và dữ liệu cá nhân.</li>

          <li>Rút lại sự đồng ý xử lý dữ liệu.</li>

          <li>Yêu cầu hạn chế xử lý dữ liệu cá nhân.</li>

          <li>Khiếu nại nếu dữ liệu bị sử dụng sai mục đích.</li>
        </ul>
      )
    },

    {
      title: 'Điều 7. Cookie và công nghệ theo dõi',
      content: (
        <div className='space-y-3'>
          <p>
            Website có thể sử dụng cookie hoặc các công nghệ tương tự để cải thiện trải nghiệm người dùng, ghi nhớ thông
            tin đăng nhập và phân tích hành vi sử dụng dịch vụ.
          </p>

          <p>
            Người dùng có thể tắt cookie trong cài đặt trình duyệt, tuy nhiên một số tính năng của website có thể không
            hoạt động chính xác.
          </p>
        </div>
      )
    },

    {
      title: 'Điều 8. Thời gian lưu trữ dữ liệu',
      content: (
        <div className='space-y-3'>
          <p>
            Dữ liệu cá nhân sẽ được lưu trữ trong thời gian cần thiết để phục vụ mục đích cung cấp dịch vụ hoặc theo quy
            định pháp luật hiện hành.
          </p>

          <p>
            Sau khi người dùng yêu cầu xóa dữ liệu hoặc chấm dứt sử dụng dịch vụ, chúng tôi sẽ tiến hành xóa hoặc ẩn
            danh dữ liệu theo quy trình nội bộ.
          </p>
        </div>
      )
    },

    {
      title: 'Điều 9. Điều khoản chung',
      content: (
        <div className='space-y-3'>
          <p>
            Chúng tôi có quyền cập nhật hoặc điều chỉnh Chính sách bảo mật này vào bất kỳ thời điểm nào để phù hợp với
            hoạt động kinh doanh và quy định pháp luật hiện hành.
          </p>

          <p>
            Phiên bản mới nhất sẽ luôn được công khai trên website. Việc tiếp tục sử dụng dịch vụ đồng nghĩa với việc
            người dùng đồng ý với các thay đổi được cập nhật.
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
              ChatPulse Privacy Policy
            </div>

            <h1 className='text-4xl font-bold tracking-tight md:text-5xl'>
              Chính sách <span className='text-primary'>bảo mật</span>
            </h1>

            <p className='text-base leading-7 text-muted-foreground md:text-lg'>
              ChatPulse cam kết bảo vệ quyền riêng tư và dữ liệu cá nhân của người dùng khi truy cập và sử dụng nền tảng
              học tập trực tuyến của chúng tôi.
            </p>
          </div>
        </div>

        {/* Sections */}
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
            © {new Date().getFullYear()} ChatPulse. Cam kết bảo vệ dữ liệu và quyền riêng tư của người dùng.
          </p>
        </div>
      </div>
    </div>
  )
}
