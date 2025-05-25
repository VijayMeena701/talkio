// Server Component - This can now be a server component since static parts are extracted
import HomeFooter from '@/components/home/HomeFooter';
import HomeLayout from '@/components/home/HomeLayout';
import HomeContainer from '@/components/home/HomeContainer';

export default function Home() {
  return (
    <HomeLayout>
      <HomeContainer />
      <HomeFooter />
    </HomeLayout>
  );
}
