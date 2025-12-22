import { MediaKit } from '../components/MediaKit';

export default function MidiaKitPublico() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || params.get('t') || undefined;

  return <MediaKit mode="public" token={token || undefined} />;
}
