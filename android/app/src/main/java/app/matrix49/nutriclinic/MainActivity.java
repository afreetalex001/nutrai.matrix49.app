package app.matrix49.nutriclinic;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // تطبيق ثيم بدون splash بعد التحميل (لون status bar أخضر + لا edge-to-edge)
        setTheme(R.style.AppTheme_NoActionBar);

        // تعطيل edge-to-edge صراحة (لـ Android 15+ تتجاهل windowOptOutEdgeToEdgeEnforcement أحياناً)
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        super.onCreate(savedInstanceState);
    }
}

