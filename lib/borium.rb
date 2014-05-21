require 'rubygems'
require 'json'
require 'socket'

class Borium

  EOT = "\004"

  def self.config
    @config ||= _resolve_configuration
  end

  def self._resolve_configuration
    configuration_file = '/etc/borium/configuration.json'
    if File.exists?(configuration_file)
      return JSON.parse(File.read(configuration_file))
    else
      return {
        'connections' => 1000,
        'host'        => 'localhost',
        'log'         => 'STDOUT',
        'port'        => 8200,
        'storage'     => '/tmp/borium/'
      }
    end
  end

  def self.get type
    request "get:#{type}:"
  end

  def self.put type, job
    request "put:#{type}:#{job}"
  end

  def self.request query
    counter = 0
    begin
      counter += 1
      socket = ::TCPSocket.new config['host'], config['port']
      socket.puts query + Borium::EOT
      data = ''
      while line = socket.gets
        break unless line
        data << line
      end
      socket.close
      return ::JSON.parse(data)
    rescue => error
      STDERR.puts error.message
      if counter > 10
        raise error
      else
        sleep 1
        retry
      end
    end
  end

end
