from pathlib import Path,os

BASE_DIR = Path(__file__).resolve().parent.parent

NPM_BIN_PATH = "C:/Program Files/nodejs/npm.cmd"

SECRET_KEY = 'django-insecure-l1u#8qmj&mfygs(0exmn%#-=jr8!$5gt5&_7)w@z8wf*ep%!(m'

DEBUG = True

ALLOWED_HOSTS = ['chemaonline.azurewebsites.net','127.0.0.1','chema.com','localhost:8000','chemaonline.azurewebsites.net']
CSRF_TRUSTED_ORIGINS = ['https://chemaonline.azurewebsites.net','https://127.0.0.1','https://chema.com']


INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sites',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    'chema',
    'user.apps.UserConfig',
    'condolence',
    'crispy_forms',
    'crispy_tailwind',
    
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'allauth.socialaccount.providers.facebook',
    
    "theme", # Your generated app name
    "tailwind",
    "django_browser_reload",
    "widget_tweaks", # Installed
]

AUTH_USER_MODEL = 'user.CustomUser'
TAILWIND_APP_NAME = "theme"

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    "allauth.account.middleware.AccountMiddleware",
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # Add the Allauth middleware here:
    "django_browser_reload.middleware.BrowserReloadMiddleware",
]

ROOT_URLCONF = 'core.urls'
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR,'templates'),
                    os.path.join(BASE_DIR,'templates','account')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'chema.context_processors.user_groups',
              
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'chema.context_processors.active_group_context',
                
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'


AUTHENTICATION_BACKENDS = (
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend'
   
)

DATABASES ={
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True



DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
    os.path.join(BASE_DIR, 'theme/static_src'),
]

LOGIN_REDIRECT_URL = '/'
LOGOUT_REDIRECT_URL = '/'

LOGIN_URL = 'account_login'
LOGOUT_URL = 'account_logout'

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

CRISPY_ALLOWED_TEMPLATE_PACKS = "tailwind"
CRISPY_TEMPLATE_PACK = 'tailwind'


EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER ='manyadzatocky@gmail.com'
EMAIL_HOST_PASSWORD = '@manymore41'

# django-allauth configuration
ACCOUNT_LOGIN_METHODS = {'email'}
ACCOUNT_SIGNUP_FIELDS = ['email*', 'password1*', 'password2*']
ACCOUNT_USER_MODEL_USERNAME_FIELD = None
ACCOUNT_EMAIL_VERIFICATION = 'none' # Can be 'mandatory' in production

SITE_ID = 1

SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': [
            'profile',
            'email',
        ],
        'AUTH_PARAMS': {
            'access_type': 'online',
        },
        'APP': {
            'client_id': 'YOUR_GOOGLE_CLIENT_ID',
            'secret': 'YOUR_GOOGLE_SECRET',
            'key': ''
        }
    },
    'facebook': {
        'METHOD': 'oauth2',
        'SDK_URL': '//connect.facebook.net/{locale}/sdk.js',
        'SCOPE': ['email', 'public_profile'],
        'AUTH_PARAMS': {'auth_type': 'reauthenticate'},
        'INIT_PARAMS': {'cookie': True},
        'FIELDS': [
            'id',
            'first_name',
            'last_name',
            'middle_name',
            'name',
            'name_format',
            'picture',
            'short_name'
        ],
        'EXCHANGE_TOKEN': True,
        'APP': {
            'client_id': 'YOUR_FACEBOOK_CLIENT_ID',
            'secret': 'YOUR_FACEBOOK_SECRET',
            'key': ''
        }
    }
}